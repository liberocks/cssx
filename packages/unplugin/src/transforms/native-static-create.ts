import type { ClassNameAllocator, CompiledStyle } from '@cssxio/compiler';

import { compiledCssRule } from '../core/compiled-css-rule';
import { loadTheme } from '../core/load-theme';
import type { CssxPluginOptions } from '../core/options';
import { wrapCssLayer } from '../core/wrap-css-layer';
import type { CssxCandidateOrigin } from '../native/stylesheet';
import { applySourceEdits } from './apply-source-edits';
import type { NativeCssxAnalyzer, NativeCssxCall, NativeCssxModuleAnalysis } from './native-static-sx';
import type { TransformResult } from './transform-cssx-module';

/** Uses Oxc to compile static create/props modules through the production compiler. */
export async function transformNativeStaticCreateModule(
  source: string,
  id: string,
  root: string,
  options: CssxPluginOptions,
  classNameAllocator: ClassNameAllocator,
  native: NativeCssxAnalyzer,
): Promise<TransformResult | null> {
  let calls: NativeCssxCall[];
  let nativeAnalysis: NativeCssxModuleAnalysis | undefined;
  try {
    if (native.analyzeCssxModule) {
      nativeAnalysis = native.analyzeCssxModule(source, id, options.importSource ?? '@cssxio/cssx');
      calls = nativeAnalysis.getCalls();
      if (nativeAnalysis.fastStaticCreate && !options.themeFile) {
        const createCall = calls.find((call) => call.entryPoint === 'create');
        const propsCalls = calls.filter((call) => call.entryPoint === 'props');
        if (createCall) {
          const arbitraryTransform = transformArbitraryStaticCreateModule(
            source,
            id,
            createCall,
            nativeAnalysis.styles,
            propsCalls,
            new Set(nativeAnalysis.usedStyleNames),
            options,
            classNameAllocator,
            createCall,
            nativeAnalysis.removableImports,
            (classNamesByStyle) =>
              nativeAnalysis!.replaceCalls(
                [...classNamesByStyle].map(([name, className]) => ({
                  name,
                  replacement: JSON.stringify({ className }),
                })),
              ),
          );
          if (arbitraryTransform) {
            return arbitraryTransform;
          }
        }
      }
    } else {
      calls = native.findCssxCalls(source, id, options.importSource ?? '@cssxio/cssx');
    }
  } catch {
    return null;
  }
  const createCalls = calls.filter((call) => call.entryPoint === 'create');
  const propsCalls = calls.filter((call) => call.entryPoint === 'props');
  if (
    calls.length === 0 ||
    createCalls.length !== 1 ||
    propsCalls.length === 0 ||
    calls.length !== createCalls.length + propsCalls.length ||
    calls.some((call) => !call.fastTransformSafe) ||
    !createCalls[0]?.staticCreate
  ) {
    return null;
  }

  const createCall = createCalls[0];
  const styleEntries = createCall.styles;
  if (!styleEntries?.length || calls.some((call) => call.entryPoint === 'props' && !call.staticProps)) {
    return null;
  }
  const styleNames = new Set(styleEntries.map(({ name }) => name));
  if (
    calls.some(
      (call) =>
        call.startUtf16 === undefined ||
        call.endUtf16 === undefined ||
        call.startUtf16 < 0 ||
        call.endUtf16 < call.startUtf16 ||
        call.endUtf16 > source.length,
    ) ||
    propsCalls.some((call) => (call.styleNames ?? []).some((name) => !styleNames.has(name)))
  ) {
    return null;
  }
  const usedStyleNames = new Set<string>();
  for (const call of propsCalls) {
    for (const name of call.styleNames ?? []) {
      usedStyleNames.add(name);
    }
  }
  if (!options.themeFile) {
    const arbitraryTransform = transformArbitraryStaticCreateModule(
      source,
      id,
      createCall,
      styleEntries,
      propsCalls,
      usedStyleNames,
      options,
      classNameAllocator,
      createCall,
      nativeAnalysis?.removableImports,
    );
    if (arbitraryTransform) {
      return arbitraryTransform;
    }
  }
  const styleInput = Object.fromEntries(styleEntries.map(({ name, utilities }) => [name, utilities]));
  const theme = await loadTheme(options, root);
  const compiler = await import('@cssxio/compiler');
  const simpleTransform = await transformSimpleStaticCreateModule(
    source,
    id,
    createCall,
    styleEntries,
    propsCalls,
    usedStyleNames,
    options,
    classNameAllocator,
    theme,
    compiler,
    nativeAnalysis?.removableImports,
  );
  if (simpleTransform) {
    return simpleTransform;
  }
  const compiled = compiler.compileStyleRecords(styleInput, {
    theme,
    classNameAllocator,
    reusabilityBudget: options.reusabilityBudget,
  });

  const candidates: Record<string, string> = Object.create(null) as Record<string, string>;
  const origins: Record<string, CssxCandidateOrigin> = Object.create(null) as Record<string, CssxCandidateOrigin>;
  for (const name of usedStyleNames) {
    const styleCandidates = compiled.candidates[name];
    const style = compiled.styles[name];
    if (!styleCandidates || !style) {
      throw new Error(`CSSX native transform could not find compiled style "${name}".`);
    }
    for (const candidate of styleCandidates) {
      const className = compiled.classes[candidate];
      if (!className) {
        throw new Error(`CSSX native transform could not find a class name for "${candidate}".`);
      }
      candidates[candidate] ??= className;
      origins[candidate] ??= { line: createCall.line - 1, column: createCall.column };
    }
  }

  const composites: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
  const atomicClasses = new Set<string>();
  const classNamesByCall = new Map<NativeCssxCall, string>();
  for (const call of propsCalls) {
    const styles: CompiledStyle[] = [];
    for (const name of call.styleNames ?? []) {
      const style = compiled.styles[name];
      if (!style) {
        throw new Error(`CSSX native transform could not find compiled style "${name}".`);
      }
      styles.push(style);
    }
    let className: string;
    if (styles.length === 1) {
      className = styles[0]!.c;
    } else {
      const composition = compiler.composeCompiledStyles(styles, classNameAllocator);
      className = composition.className;
      if (className) {
        composites[className] = composition.atomicClasses;
      }
    }
    classNamesByCall.set(call, className);
    for (const name of className.split(/\s+/).filter(Boolean)) {
      const atomicClassesForComposite = compiled.composites[name];
      if (atomicClassesForComposite) {
        composites[name] = atomicClassesForComposite;
      } else if (!composites[name]) {
        atomicClasses.add(name);
      }
    }
  }

  const candidateNames = Object.keys(candidates);
  const utilityCss = candidateNames.length
    ? (
        await compiler.compileUtilities(
          candidateNames,
          (candidate) => candidates[candidate]!,
          theme,
          compiler.createSelectorAliases(composites),
          atomicClasses,
          { darkMode: options.darkMode },
        )
      ).css
    : '';

  const rewritten = replaceStaticCreateCalls(
    source,
    id,
    createCall,
    propsCalls,
    classNamesByCall,
    nativeAnalysis?.removableImports,
  );
  return {
    code: rewritten.code,
    map: rewritten.map,
    rules: utilityCss ? [compiledCssRule(wrapCssLayer(utilityCss, options.layer))] : [],
    candidates,
    composites,
    atomicClasses: [...atomicClasses].sort(),
    origins,
    cssOnlySignature: '',
  };
}

/** Emits the fast production form when each referenced style can remain atomic. */
async function transformSimpleStaticCreateModule(
  source: string,
  sourceId: string,
  createCall: NativeCssxCall,
  styleEntries: NonNullable<NativeCssxCall['styles']>,
  propsCalls: readonly NativeCssxCall[],
  usedStyleNames: ReadonlySet<string>,
  options: CssxPluginOptions,
  classNameAllocator: ClassNameAllocator,
  theme: string | undefined,
  compiler: typeof import('@cssxio/compiler'),
  removableImports: readonly { readonly start: number; readonly end: number }[] = [],
): Promise<TransformResult | null> {
  if (propsCalls.some((call) => (call.styleNames?.length ?? 0) > 1)) {
    return null;
  }

  const candidatesByStyle = new Map(
    styleEntries.map(({ name, utilities }) => [name, compiler.splitCandidateList(utilities)]),
  );
  const classifications = new Map<string, ReturnType<typeof compiler.classifyUtility>>();
  const candidateNames = new Set<string>();
  for (const name of usedStyleNames) {
    const candidates = candidatesByStyle.get(name)!;
    const utilitiesByScope = new Map<string, Array<{ group: string; conflicts: readonly string[] }>>();
    for (const candidate of candidates) {
      let classification = classifications.get(candidate);
      if (classification === undefined) {
        classification = compiler.classifyUtility(candidate);
        classifications.set(candidate, classification);
      }
      if (!classification) {
        return null;
      }
      const utilities = utilitiesByScope.get(classification.scope) ?? [];
      if (
        utilities.some(
          (utility) =>
            classification.conflicts.includes(utility.group) || utility.conflicts.includes(classification.group),
        )
      ) {
        return null;
      }
      utilities.push({ group: classification.group, conflicts: classification.conflicts });
      utilitiesByScope.set(classification.scope, utilities);
      candidateNames.add(candidate);
    }
  }
  const names = [...candidateNames];
  const allocatedNames = classNameAllocator.allocate(names);
  const candidates: Record<string, string> = Object.create(null) as Record<string, string>;
  const origins: Record<string, CssxCandidateOrigin> = Object.create(null) as Record<string, CssxCandidateOrigin>;
  const atomicClasses = new Set<string>();
  for (const candidate of names) {
    const className = allocatedNames.get(candidate)!;
    candidates[candidate] = className;
    origins[candidate] = { line: createCall.line - 1, column: createCall.column };
    atomicClasses.add(className);
  }

  const classNamesByCall = new Map<NativeCssxCall, string>();
  for (const call of propsCalls) {
    const name = call.styleNames?.[0];
    const styleCandidates = name === undefined ? [] : candidatesByStyle.get(name)!;
    classNamesByCall.set(call, styleCandidates.map((candidate) => allocatedNames.get(candidate)!).join(' '));
  }
  const utilityCss = names.length
    ? (
        await compiler.compileUtilities(
          names,
          (candidate) => allocatedNames.get(candidate)!,
          theme,
          {},
          atomicClasses,
          {
            darkMode: options.darkMode,
          },
        )
      ).css
    : '';
  const rewritten = replaceStaticCreateCalls(
    source,
    sourceId,
    createCall,
    propsCalls,
    classNamesByCall,
    removableImports,
  );
  return {
    code: rewritten.code,
    map: rewritten.map,
    rules: utilityCss ? [compiledCssRule(wrapCssLayer(utilityCss, options.layer))] : [],
    candidates,
    composites: {},
    atomicClasses: [...atomicClasses].sort(),
    origins,
    cssOnlySignature: '',
  };
}

/** A validated arbitrary-property candidate and its CSS declaration. */
interface ArbitraryDeclaration {
  readonly candidate: string;
  readonly property: string;
  readonly value: string;
}

/** Compiles the common plain arbitrary-property map without loading the utility registry. */
function transformArbitraryStaticCreateModule(
  source: string,
  sourceId: string,
  createCall: Pick<NativeCssxCall, 'line' | 'column'>,
  styleEntries: readonly { readonly name: string; readonly utilities: string }[],
  propsCalls: readonly NativeCssxCall[],
  usedStyleNames: ReadonlySet<string>,
  options: CssxPluginOptions,
  classNameAllocator: ClassNameAllocator,
  createCallForRewrite: NativeCssxCall,
  removableImports: readonly { readonly start: number; readonly end: number }[] = [],
  replaceCalls?: (classNamesByStyle: ReadonlyMap<string, string>) => string,
): TransformResult | null {
  if (
    propsCalls.some((call) => (call.styleNames?.length ?? 0) > 1) ||
    styleEntries.some(({ utilities }) => /\bvar\s*\(/i.test(utilities))
  ) {
    return null;
  }

  const stylesByName = new Map(styleEntries.map((style) => [style.name, style.utilities]));
  if ([...usedStyleNames].some((name) => !stylesByName.has(name))) {
    return null;
  }
  const candidatesByStyle = new Map<string, readonly string[]>();
  const declarationsByCandidate = new Map<string, ArbitraryDeclaration>();
  const declarationCache = new Map<string, ArbitraryDeclaration>();
  const candidates = new Set<string>();
  for (const [name, utilities] of stylesByName) {
    const parsed = splitPlainArbitraryProperties(utilities, declarationCache);
    if (!parsed) {
      return null;
    }
    candidatesByStyle.set(
      name,
      parsed.map(({ candidate }) => candidate),
    );
    if (!usedStyleNames.has(name)) {
      continue;
    }
    const propertiesInStyle = new Map<string, string>();
    for (const item of parsed) {
      const normalizedProperty = item.property.toLowerCase();
      const previousValue = propertiesInStyle.get(normalizedProperty);
      if (previousValue !== undefined && previousValue !== item.value) {
        return null;
      }
      propertiesInStyle.set(normalizedProperty, item.value);
      candidates.add(item.candidate);
      declarationsByCandidate.set(item.candidate, item);
    }
  }

  const candidateNames = [...candidates].sort();
  const classNames = classNameAllocator.allocate(candidateNames);
  const candidateClasses: Record<string, string> = Object.create(null) as Record<string, string>;
  const origins: Record<string, CssxCandidateOrigin> = Object.create(null) as Record<string, CssxCandidateOrigin>;
  const atomicClasses = new Set<string>();
  const cssRules: string[] = [];
  for (const candidate of candidateNames) {
    const className = classNames.get(candidate)!;
    const declaration = declarationsByCandidate.get(candidate)!;
    candidateClasses[candidate] = className;
    origins[candidate] = { line: createCall.line - 1, column: createCall.column };
    atomicClasses.add(className);
    cssRules.push(`.${className}{${declaration.property}:${declaration.value}}`);
  }
  const classNamesByStyle = new Map<string, string>();
  for (const name of usedStyleNames) {
    classNamesByStyle.set(
      name,
      candidatesByStyle
        .get(name)!
        .map((candidate) => classNames.get(candidate)!)
        .join(' '),
    );
  }
  const classNamesByCall = new Map(
    propsCalls.map((call) => {
      const name = call.styleNames?.[0];
      return [call, name === undefined ? '' : classNamesByStyle.get(name)!] as const;
    }),
  );
  const utilityCss = cssRules.join('');
  const rewritten = replaceStaticCreateCalls(
    source,
    sourceId,
    createCallForRewrite,
    propsCalls,
    classNamesByCall,
    removableImports,
  );
  return {
    code: replaceCalls ? replaceCalls(classNamesByStyle) : rewritten.code,
    map: rewritten.map,
    rules: utilityCss ? [compiledCssRule(wrapCssLayer(utilityCss, options.layer))] : [],
    candidates: candidateClasses,
    composites: {},
    atomicClasses: [...atomicClasses].sort(),
    origins,
    cssOnlySignature: '',
    precompiledCss: utilityCss,
  };
}

/** Splits and validates plain arbitrary declarations while preserving value spaces. */
function splitPlainArbitraryProperties(
  value: string,
  declarationCache: Map<string, ArbitraryDeclaration>,
): ArbitraryDeclaration[] | null {
  const candidates: string[] = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index <= value.length; index++) {
    const character = value[index];
    if (character === '[') {
      if (depth !== 0) {
        return null;
      }
      depth = 1;
    } else if (character === ']') {
      if (depth !== 1) {
        return null;
      }
      depth = 0;
    }
    if ((character === undefined || isWhitespace(character)) && depth === 0) {
      if (index > start) {
        candidates.push(value.slice(start, index));
      }
      start = index + 1;
    }
  }
  if (depth !== 0) {
    return null;
  }
  const declarations = [];
  for (const candidate of candidates) {
    const cached = declarationCache.get(candidate);
    if (cached !== undefined) {
      declarations.push(cached);
      continue;
    }
    if (candidate.length > 500 || !candidate.startsWith('[') || !candidate.endsWith(']')) {
      return null;
    }
    const content = candidate.slice(1, -1);
    const separator = content.indexOf(':');
    if (separator < 1) {
      return null;
    }
    const property = content.slice(0, separator).trim();
    const cssValue = content.slice(separator + 1).trim();
    if (
      !/^(?:--[a-z0-9-]+|[a-z-]+)$/i.test(property) ||
      !/^[A-Za-z0-9#().,% /+:-]+$/.test(cssValue) ||
      !cssValue ||
      !balancedParentheses(cssValue)
    ) {
      return null;
    }
    const declaration = { candidate, property, value: cssValue };
    declarationCache.set(candidate, declaration);
    declarations.push(declaration);
  }
  return declarations;
}

/** Matches JavaScript's `\s` set without running a regular expression for every character. */
function isWhitespace(character: string): boolean {
  const code = character.charCodeAt(0);
  return (
    (code >= 0x09 && code <= 0x0d) ||
    code === 0x20 ||
    code === 0xa0 ||
    code === 0x1680 ||
    (code >= 0x2000 && code <= 0x200a) ||
    code === 0x2028 ||
    code === 0x2029 ||
    code === 0x202f ||
    code === 0x205f ||
    code === 0x3000 ||
    code === 0xfeff
  );
}

/** Checks whether CSS function calls in an arbitrary value have balanced parentheses. */
function balancedParentheses(value: string): boolean {
  let depth = 0;
  for (const character of value) {
    if (character === '(') {
      depth++;
    } else if (character === ')') {
      depth--;
      if (depth < 0) {
        return false;
      }
    }
  }
  return depth === 0;
}

/** Replaces the static map and its statically resolved props calls in source order. */
function replaceStaticCreateCalls(
  source: string,
  sourceId: string,
  createCall: NativeCssxCall,
  propsCalls: readonly NativeCssxCall[],
  classNamesByCall: ReadonlyMap<NativeCssxCall, string>,
  removableImports: readonly { readonly start: number; readonly end: number }[] = [],
): { readonly code: string; readonly map: NonNullable<import('./transform-cssx-module').TransformResult['map']> } {
  return applySourceEdits(source, sourceId, [
    { start: createCall.startUtf16!, end: createCall.endUtf16!, content: '{}' },
    ...removableImports.map(({ start, end }) => ({ start, end, content: '' })),
    ...propsCalls.map((call) => ({
      start: call.startUtf16!,
      end: call.endUtf16!,
      content: JSON.stringify({ className: classNamesByCall.get(call)! }),
    })),
  ]);
}
