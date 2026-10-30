import { compileStyleRecords, stableCompositeName } from '@cssxio/compiler';
import type { ClassNameAllocator } from '@cssxio/compiler';

import { loadTheme } from '../core/load-theme';
import type { CssxPluginOptions } from '../core/options';
import type { CssxSourceModule } from '../native/stylesheet-types';
import { loadNativeAnalyzer } from './load-native-analyzer';

/** Static CSSX call data returned by the native Oxc analyzer. */
export interface NativeCssxCall {
  readonly entryPoint: string;
  readonly start?: number;
  readonly end?: number;
  readonly startUtf16?: number;
  readonly endUtf16?: number;
  readonly line: number;
  readonly column: number;
  readonly staticSx: boolean;
  readonly utilities: readonly string[];
  /** Static literal map returned for a `create()` call. */
  readonly styles?: readonly { readonly name: string; readonly utilities: string }[];
  /** Static keys referenced by a `props()` call. */
  readonly styleNames?: readonly string[];
  /** Whether `create()` contains only string values in an object literal. */
  readonly staticCreate?: boolean;
  /** Whether every `props()` argument resolves to a known static style key. */
  readonly staticProps?: boolean;
  /** Whether all style-map references can be folded safely in this module. */
  readonly fastTransformSafe?: boolean;
}

/** Runtime interface exposed by the optional N-API addon. */
export interface NativeCssxAnalyzer {
  /** Finds CSSX calls whose imported binding resolves to a known entry point. */
  findCssxCalls(source: string, filename: string, importSource?: string): NativeCssxCall[];
  /** Retains CSSX call metadata in Rust until the transform needs the general compiler fallback. */
  analyzeCssxModule?(source: string, filename: string, importSource?: string): NativeCssxModuleAnalysis;
}

/** CSSX module analysis retained by the native addon. */
export interface NativeCssxModuleAnalysis {
  readonly fastStaticCreate: boolean;
  readonly styles: readonly { readonly name: string; readonly utilities: string }[];
  readonly usedStyleNames: readonly string[];
  readonly createLine: number;
  readonly createColumn: number;
  /** Rewrites all static create and props calls without returning each call across N-API. */
  replaceCalls(replacements: readonly { readonly name: string; readonly replacement: string }[]): string;
  /** Returns individual call records only when the utility subset needs the general compiler. */
  getCalls(): NativeCssxCall[];
}

/** Whether the module was handled and, if so, its emitted metadata. */
type NativeScanResult =
  | {
      readonly handled: true;
      readonly module?: CssxSourceModule;
      readonly transformedCode?: string;
      readonly cssOnlySignature?: string;
    }
  | { readonly handled: false };

/** Uses the optional local Rust addon to collect metadata for static `sx()`-only modules. */
export async function scanNativeStaticSxModule(
  source: string,
  id: string,
  root: string,
  options: CssxPluginOptions,
  classNameAllocator: ClassNameAllocator,
  stableClassNameFileName: string,
  nativeOverride?: NativeCssxAnalyzer | null,
): Promise<NativeScanResult> {
  if (options.mode !== 'development' || !source.includes(options.importSource ?? '@cssxio/cssx')) {
    return { handled: false };
  }
  const native = nativeOverride === undefined ? loadNativeAnalyzer() : (nativeOverride ?? undefined);
  if (!native) {
    return { handled: false };
  }

  let calls: NativeCssxCall[];
  try {
    calls = native.findCssxCalls(source, id, options.importSource ?? '@cssxio/cssx');
  } catch {
    return { handled: false };
  }
  if (calls.some((call) => call.entryPoint !== 'sx' || !call.staticSx)) {
    return { handled: false };
  }
  if (calls.length === 0) {
    return { handled: true };
  }

  const theme = await loadTheme(options, root);
  const metadata = compileStaticSxCalls(calls, stableClassNameFileName, theme, classNameAllocator);
  if (!metadata) {
    return { handled: false };
  }

  let transformedCode = source;
  const ranges: { readonly start: number; readonly end: number }[] = [];
  for (let ordinal = calls.length - 1; ordinal >= 0; ordinal--) {
    const call = calls[ordinal]!;
    const utilitySource = call.utilities.filter((utility) => utility.trim().length > 0).join(' ');
    if (call.startUtf16 === undefined || call.endUtf16 === undefined) {
      transformedCode = '';
      break;
    }
    ranges.push({ start: call.startUtf16, end: call.endUtf16 });
    let replacement: string;
    if (!utilitySource) {
      replacement = '';
    } else if (isGeneratedClassNames(utilitySource)) {
      continue;
    } else {
      replacement = stableCompositeName(stableClassNameFileName, undefined, `sx:${ordinal}:segment:0`);
    }
    transformedCode =
      transformedCode.slice(0, call.startUtf16) + JSON.stringify(replacement) + transformedCode.slice(call.endUtf16);
  }

  const result = { handled: true as const, module: { id, ...metadata } };
  if (!transformedCode) {
    return result;
  }
  const { cssOnlySignature } = await import('@cssxio/babel-plugin');
  return { ...result, transformedCode, cssOnlySignature: cssOnlySignature(source, ranges) };
}

/** Compiles call data from Oxc with the shared CSSX compiler and development identities. */
export function compileStaticSxCalls(
  calls: readonly NativeCssxCall[],
  stableClassNameFileName: string,
  theme: string | undefined,
  classNameAllocator: ClassNameAllocator,
): Omit<CssxSourceModule, 'id'> | undefined {
  const candidates: Record<string, string> = Object.create(null) as Record<string, string>;
  const composites: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
  const origins: Record<string, { readonly line: number; readonly column: number }> = Object.create(null) as Record<
    string,
    { readonly line: number; readonly column: number }
  >;
  for (let ordinal = 0; ordinal < calls.length; ordinal++) {
    const call = calls[ordinal]!;
    const source = call.utilities.filter((utility) => utility.trim().length > 0).join(' ');
    if (!source || isGeneratedClassNames(source)) {
      continue;
    }
    let compiled;
    try {
      compiled = compileStyleRecords({ inline: source }, { theme, classNameAllocator, reusabilityBudget: 0 });
    } catch {
      return undefined;
    }
    for (const [candidate, className] of Object.entries(compiled.classes)) {
      candidates[candidate] ??= className;
      origins[candidate] ??= { line: call.line - 1, column: call.column };
    }
    const composite = [
      ...new Set(
        compiled.styles
          .inline!._.map((record) => record[0])
          .filter((className): className is string => Boolean(className)),
      ),
    ];
    if (composite.length === 0) {
      return undefined;
    }
    const stableClassName = stableCompositeName(stableClassNameFileName, undefined, `sx:${ordinal}:segment:0`);
    composites[stableClassName] = composite;
  }

  return { candidates, composites, atomicClasses: [], origins };
}

/** Checks whether the value contains only previously generated CSSX class names. */
function isGeneratedClassNames(value: string): boolean {
  return /^(?:s[0-9A-Za-z]+x|d[0-9a-z]+x)(?:\s+(?:s[0-9A-Za-z]+x|d[0-9a-z]+x))*$/.test(value);
}
