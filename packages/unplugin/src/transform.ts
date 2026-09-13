import { transformAsync } from '@babel/core';
import cssxBabelPlugin from '@cssxio/babel-plugin';
import { compileUtilities, createClassNameAllocator, createSelectorAliases } from '@cssxio/compiler';
import type { ClassNameAllocator, CssxRule } from '@cssxio/compiler';
import { parse as parseVueSfc } from '@vue/compiler-sfc';
import { assertPluginOptions, loadTheme, type CssxPluginOptions } from './options';
import { quoteVueTemplateExpression } from './quote-vue-template-expression';
import type { IncomingSourceMap } from './source-map-from-context';
import type { CssxCandidateOrigin } from './stylesheet';
import { templateAttributeQuote } from './template-attribute-quote';
import { compiledCssRule } from './compiled-css-rule';
import { wrapCssLayer } from './wrap-css-layer';
import { remapVueBlockOrigins } from './remap-vue-block-origins';
import { remapVueTemplateOrigins } from './remap-vue-template-origins';

export { sourceMapFromContext } from './source-map-from-context';
export type { IncomingSourceMap } from './source-map-from-context';

/** The result of transforming one source module. */
export interface TransformResult {
  /** JavaScript source after the CSSX transform. */
  readonly code: string;
  /** Compiled utility rules collected from this module. */
  readonly rules: readonly CssxRule[];
  /** Maps utility strings to generated class names. */
  readonly candidates: Readonly<Record<string, string>>;
  /** Maps composite classes to their winning atomic classes. */
  readonly composites: Readonly<Record<string, readonly string[]>>;
  /** Atomic classes required by compiled styles that survive to runtime. */
  readonly atomicClasses: readonly string[];
  /** Maps utility strings to their locations in the source module. */
  readonly origins: Readonly<Record<string, CssxCandidateOrigin>>;
  /** Source with CSSX utility literals removed, used to identify CSS-only edits. */
  readonly cssOnlySignature: string;
  /** Source map that continues a map supplied by an earlier transform. */
  readonly map?: NonNullable<Awaited<ReturnType<typeof transformAsync>>>['map'];
}

/** Extensions of JavaScript, TypeScript, Astro, and Vue modules handled by this transform. */
const SCRIPT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.cjs',
  '.cjsx',
  '.cts',
  '.ctsx',
  '.mjs',
  '.mjsx',
  '.mts',
  '.mtsx',
  '.astro',
  '.vue',
]);

/**
 * Transforms one source module that imports CSSX.
 *
 * @param code Source code to transform.
 * @param id The source module ID.
 * @param options Adapter options.
 * @param inputSourceMap An optional source map from an earlier transform.
 * @returns The transformed module, or null when the module does not use CSSX.
 */
export async function transformCssxModule(
  code: string,
  id: string,
  options: CssxPluginOptions & {
    readonly classNameAllocator?: ClassNameAllocator;
    readonly stableClassNames?: boolean;
    readonly stableClassNameFileName?: string;
  } = {},
  inputSourceMap?: IncomingSourceMap,
): Promise<TransformResult | null> {
  assertPluginOptions(options);
  const importSource = options.importSource ?? '@cssxio/cssx';
  const sourceId = id.split('?', 1).join('');
  if (!SCRIPT_EXTENSIONS.has(sourceId.slice(sourceId.lastIndexOf('.'))) || !code.includes(importSource)) {
    return null;
  }
  if (sourceId.endsWith('.astro')) {
    return transformAstroSxModule(code, id, options);
  }
  if (sourceId.endsWith('.vue')) {
    return transformVueSfcModule(code, id, options);
  }
  const theme = await loadTheme(options);
  const transformed = (await transformAsync(code, {
    babelrc: false,
    configFile: false,
    filename: sourceId,
    parserOpts: { plugins: ['jsx', 'typescript'] },
    plugins: [
      [
        cssxBabelPlugin,
        {
          importSource,
          classNameAllocator: options.classNameAllocator,
          theme,
          reusabilityBudget: options.reusabilityBudget,
          stableClassNames: options.stableClassNames,
          stableClassNameFileName: options.stableClassNameFileName,
          darkMode: options.darkMode,
        },
      ],
    ],
    sourceMaps: true,
    ...(inputSourceMap ? { inputSourceMap } : {}),
  }))!;
  const metadata = transformed.metadata as unknown as {
    readonly cssx: CssxMetadata;
  };
  const { candidates, origins, composites, atomicClasses, cssOnlySignature } = metadata.cssx;
  const candidateNames = Object.keys(candidates);
  const utilityCss =
    candidateNames.length === 0
      ? ''
      : (
          await compileUtilities(
            candidateNames,
            (candidate) => candidates[candidate]!,
            theme,
            createSelectorAliases(composites),
            new Set(atomicClasses),
            { darkMode: options.darkMode },
          )
        ).css;
  return {
    code: transformed.code!,
    rules: utilityCss ? [compiledCssRule(wrapCssLayer(utilityCss, options.layer))] : [],
    candidates,
    composites,
    atomicClasses,
    origins,
    cssOnlySignature,
    map: transformed.map!,
  };
}

/**
 * Transforms CSSX calls inside Vue Single-File Component script and template blocks.
 *
 * Vue templates expose imports from `script setup` to template expressions, so
 * `:class="sx(...)"` uses the same CSSX API as JSX while retaining native SFC
 * syntax for the Vue plugin that runs later in Vite's transform pipeline.
 */
async function transformVueSfcModule(
  code: string,
  id: string,
  options: CssxPluginOptions & {
    readonly classNameAllocator?: ClassNameAllocator;
    readonly stableClassNames?: boolean;
    readonly stableClassNameFileName?: string;
  },
): Promise<TransformResult | null> {
  const sourceId = id.split('?', 1).join('');
  const parsed = parseVueSfc(code, { filename: sourceId });
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]!.message);
  }

  const classNameAllocator = options.classNameAllocator ?? createClassNameAllocator();
  const replacements: Array<{ readonly start: number; readonly end: number; readonly code: string }> = [];
  const candidates: Record<string, string> = {};
  const composites: Record<string, readonly string[]> = {};
  const rules: CssxRule[] = [];
  const atomicClasses = new Set<string>();
  const origins: Record<string, CssxCandidateOrigin> = {};

  for (const block of [parsed.descriptor.script, parsed.descriptor.scriptSetup]) {
    if (!block?.content.includes(options.importSource ?? '@cssxio/cssx')) {
      continue;
    }
    const extension = block.lang === 'js' || block.lang === 'jsx' || block.lang === 'tsx' ? block.lang : 'ts';
    const transformed = (await transformCssxModule(block.content, `${sourceId}.cssx-vue-script.${extension}`, {
      ...options,
      classNameAllocator,
    }))!;
    replacements.push({ start: block.loc.start.offset, end: block.loc.end.offset, code: transformed.code });
    Object.assign(candidates, transformed.candidates);
    Object.assign(composites, transformed.composites);
    Object.assign(origins, remapVueBlockOrigins(code, block.loc.start.offset, transformed.origins));
    rules.push(...transformed.rules);
    for (const className of transformed.atomicClasses) {
      atomicClasses.add(className);
    }
  }

  const template = parsed.descriptor.template;
  if (template?.content.includes('sx')) {
    const transformed = await transformVueTemplateSx(template.content, sourceId, options, classNameAllocator);
    if (transformed) {
      replacements.push({ start: template.loc.start.offset, end: template.loc.end.offset, code: transformed.code });
      Object.assign(candidates, transformed.candidates);
      Object.assign(composites, transformed.composites);
      Object.assign(origins, remapVueBlockOrigins(code, template.loc.start.offset, transformed.origins));
      rules.push(...transformed.rules);
      for (const className of transformed.atomicClasses) {
        atomicClasses.add(className);
      }
    }
  }

  if (replacements.length === 0) {
    return null;
  }
  let transformedCode = code;
  for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
    transformedCode = `${transformedCode.slice(0, replacement.start)}${replacement.code}${transformedCode.slice(replacement.end)}`;
  }
  return {
    code: transformedCode,
    rules,
    candidates,
    composites,
    atomicClasses: [...atomicClasses],
    origins,
    cssOnlySignature: transformedCode,
  };
}

/** Transforms static CSSX `sx()` calls embedded in a Vue template. */
async function transformVueTemplateSx(
  code: string,
  sourceId: string,
  options: CssxPluginOptions & {
    readonly classNameAllocator?: ClassNameAllocator;
    readonly stableClassNames?: boolean;
    readonly stableClassNameFileName?: string;
  },
  classNameAllocator: ClassNameAllocator,
): Promise<TransformResult | null> {
  const calls = astroSxCalls(code);
  if (calls.length === 0) {
    return null;
  }
  const importSource = options.importSource ?? '@cssxio/cssx';
  const candidates: Record<string, string> = {};
  const composites: Record<string, readonly string[]> = {};
  const rules: CssxRule[] = [];
  const atomicClasses = new Set<string>();
  const origins: Record<string, CssxCandidateOrigin> = {};
  let transformedCode = code;

  for (const call of [...calls].reverse()) {
    const wrapperPrefix = `import { sx } from ${JSON.stringify(importSource)};\nconst style = `;
    const wrapperSource = `${wrapperPrefix}${call.code};`;
    const transformed = (await transformCssxModule(wrapperSource, `${sourceId}.cssx-vue-template.ts`, {
      ...options,
      classNameAllocator,
    })) as TransformResult;
    const expression = quoteVueTemplateExpression(
      transformedExpression(transformed.code),
      templateAttributeQuote(code, call.start),
    );
    transformedCode = `${transformedCode.slice(0, call.start)}${expression}${transformedCode.slice(call.end)}`;
    Object.assign(candidates, transformed.candidates);
    Object.assign(composites, transformed.composites);
    Object.assign(
      origins,
      remapVueTemplateOrigins(code, call.start, wrapperSource, wrapperPrefix.length, transformed.origins),
    );
    rules.push(...transformed.rules);
    for (const className of transformed.atomicClasses) {
      atomicClasses.add(className);
    }
  }
  return {
    code: transformedCode,
    rules,
    candidates,
    composites,
    atomicClasses: [...atomicClasses],
    origins,
    cssOnlySignature: transformedCode,
  };
}

/**
 * Transforms `sx` expressions embedded in an Astro template without parsing its HTML as JavaScript.
 *
 * @param code Astro component source.
 * @param id Astro component identifier.
 * @param options Adapter options.
 * @returns Transformed Astro source and its compiled CSS metadata.
 */
async function transformAstroSxModule(
  code: string,
  id: string,
  options: CssxPluginOptions & {
    readonly classNameAllocator?: ClassNameAllocator;
    readonly stableClassNames?: boolean;
    readonly stableClassNameFileName?: string;
  },
): Promise<TransformResult | null> {
  const calls = astroSxCalls(code);
  if (calls.length === 0) {
    return null;
  }

  const classNameAllocator = options.classNameAllocator ?? createClassNameAllocator();
  const importSource = options.importSource ?? '@cssxio/cssx';
  const candidates: Record<string, string> = {};
  const composites: Record<string, readonly string[]> = {};
  const rules: CssxRule[] = [];
  let transformedCode = code;

  for (const call of [...calls].reverse()) {
    const transformed = (await transformCssxModule(
      `import { sx } from ${JSON.stringify(importSource)};\nconst style = ${call.code};`,
      `${id}.ts`,
      { ...options, classNameAllocator },
    )) as TransformResult;
    const expression = transformedExpression(transformed.code);
    transformedCode = `${transformedCode.slice(0, call.start)}${expression}${transformedCode.slice(call.end)}`;
    Object.assign(candidates, transformed.candidates);
    Object.assign(composites, transformed.composites);
    rules.push(...transformed.rules);
  }

  return {
    code: transformedCode,
    rules,
    candidates,
    composites,
    atomicClasses: [],
    origins: {},
    cssOnlySignature: transformedCode,
  };
}

/** Finds complete `sx(...)` calls without interpreting the surrounding Astro template. */
function astroSxCalls(code: string): { readonly start: number; readonly end: number; readonly code: string }[] {
  const calls: { start: number; end: number; code: string }[] = [];
  const expression = /\bsx\s*\(/g;
  for (const match of code.matchAll(expression)) {
    const start = match.index!;
    const open = code.indexOf('(', start);
    let depth = 0;
    let quote = '';
    for (let index = open; index < code.length; index += 1) {
      const character = code[index]!;
      if (quote) {
        if (character === '\\') {
          index += 1;
        } else if (character === quote) {
          quote = '';
        }
        continue;
      }
      if (character === '"' || character === "'" || character === '`') {
        quote = character;
      } else if (character === '(') {
        depth += 1;
      } else if (character === ')' && --depth === 0) {
        calls.push({ start, end: index + 1, code: code.slice(start, index + 1) });
        expression.lastIndex = index + 1;
        break;
      }
    }
  }
  return calls;
}

/** Extracts the transformed `sx` expression from the synthetic JavaScript module. */
function transformedExpression(code: string): string {
  const prefix = 'const style = ';
  const start = code.indexOf(prefix) + prefix.length;
  const end = code.indexOf(';', start);
  return code.slice(start, end);
}

/** CSSX metadata written by the Babel transform. */
interface CssxMetadata {
  /** Maps utility strings to generated class names. */
  readonly candidates: Readonly<Record<string, string>>;
  /** Maps utility strings to their locations in the source module. */
  readonly origins: Readonly<Record<string, CssxCandidateOrigin>>;
  /** Maps composite classes to their winning atomic classes. */
  readonly composites: Readonly<Record<string, readonly string[]>>;
  /** Atomic classes required by compiled styles that survive to runtime. */
  readonly atomicClasses: readonly string[];
  /** Source with CSSX utility literals removed. */
  readonly cssOnlySignature: string;
}
