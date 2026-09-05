import { transformAsync } from '@babel/core';
import cssxBabelPlugin from '@cssxio/babel-plugin';
import { compileUtilities, createClassNameAllocator, createSelectorAliases } from '@cssxio/compiler';
import type { ClassNameAllocator, CssxRule } from '@cssxio/compiler';
import { assertPluginOptions, loadTheme, stableId, type CssxPluginOptions } from './options';
import type { CssxCandidateOrigin } from './stylesheet';

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

/** A source map accepted from a build tool. */
export interface IncomingSourceMap {
  /** Source map format version. CSSX accepts version 3. */
  readonly version: number;
  /** Source file names referenced by the map. */
  readonly sources: string[];
  /** Original identifier names referenced by the map. */
  readonly names: string[];
  /** Optional prefix for source file names. */
  readonly sourceRoot?: string;
  /** Optional source file contents. */
  readonly sourcesContent?: string[];
  /** Encoded source map segments. */
  readonly mappings: string;
  /** Name of the generated file. */
  readonly file: string;
}

/** Extensions of JavaScript, TypeScript, and Astro modules handled by this transform. */
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

/**
 * Reads a source map from a build tool transform context.
 *
 * @param context A build tool transform context.
 * @param id The source module ID.
 * @returns A source map, when the context provides a compatible one.
 */
export function sourceMapFromContext(context: unknown, id: string): IncomingSourceMap | undefined {
  if (!context || typeof context !== 'object') {
    return undefined;
  }
  const getCombinedSourcemap = (context as { readonly getCombinedSourcemap?: unknown }).getCombinedSourcemap;
  if (typeof getCombinedSourcemap !== 'function') {
    return undefined;
  }
  const sourceMap = getCombinedSourcemap.call(context);
  if (!sourceMap || typeof sourceMap !== 'object') {
    return undefined;
  }
  const map = sourceMap as Partial<IncomingSourceMap>;
  if (map.version !== 3 || !Array.isArray(map.sources) || typeof map.mappings !== 'string') {
    return undefined;
  }
  return {
    version: map.version,
    sources: [...map.sources],
    names: [...(map.names ?? [])],
    mappings: map.mappings,
    file: map.file ?? id.split('?', 1).join(''),
    ...(map.sourceRoot ? { sourceRoot: map.sourceRoot } : {}),
    ...(map.sourcesContent ? { sourcesContent: [...map.sourcesContent] } : {}),
  };
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

/**
 * Converts compiled CSS into the rule shape used for stylesheet collection.
 *
 * @param css Compiled CSS for one module.
 * @returns A CSSX rule with a stable generated class name.
 */
function compiledCssRule(css: string): CssxRule {
  return { className: `cssx-${stableId(css)}`, css };
}

/**
 * Wraps CSS in the configured layer when one is set.
 *
 * @param css CSS to wrap.
 * @param layer Optional CSS layer name.
 * @returns The original CSS or CSS wrapped in an `@layer` rule.
 */
function wrapCssLayer(css: string, layer: string | undefined): string {
  return css && layer ? `@layer ${layer}{${css}}` : css;
}
