export {
  classifyUtility,
  compileStyleRecords,
  compileStyleRecordMaps,
  composeCompiledStyles,
  createClassNameAllocator,
  mergeCompiledStyles,
} from './conflicts';
export type {
  StyleComposition,
  ClassNameAllocator,
  ClassNameOptions,
  ReusabilityBudget,
  StyleCompilerOptions,
  CompiledStyle,
  CompiledStyleRecordMap,
  CompiledStyleRecordMaps,
  CompiledUtility,
  UtilityConflictRecord,
} from './conflicts';
export { compileSourceUtilities, compileUtilities, describeUtilityRecipe, validateUtilityCandidate } from './utilities';
export type {
  UtilityDeclaration,
  UtilityCompilation,
  UtilityCssEntry,
  UtilityRecipe,
  UtilityRecipeResources,
  UtilityWriteSet,
} from './utilities';
export type { DarkMode } from './utility-variants';
export type { CssxTheme, ThemeOutputMode } from './theme';
export { parseTheme } from './theme';
export { splitCandidateList } from './candidate';

import { compileStyleRecords, compileStyleRecordMaps } from './conflicts';
import type {
  ClassNameAllocator,
  ClassNameOptions,
  CompiledStyle,
  CompiledStyleRecordMap,
  ReusabilityBudget,
} from './conflicts';
import { compileUtilities } from './utilities';
import type { DarkMode } from './utility-variants';

/** One generated class name and the CSS rule it identifies. */
export interface CssxRule {
  /** Stable class name for this generated CSS payload. */
  readonly className: string;
  /** Complete CSS emitted for the class name. */
  readonly css: string;
}

/** Options for compiling style maps. */
export interface CompilerOptions {
  /** CSS theme input added to the default theme before compilation. */
  readonly theme?: string;
  /** Options that control generated atomic and composite class names. */
  readonly className?: ClassNameOptions;
  /** Shared allocator used to keep class names unique across compiler calls. */
  readonly classNameAllocator?: ClassNameAllocator;
  /** Controls how aggressively static styles share generated class fragments. */
  readonly reusabilityBudget?: ReusabilityBudget;
  /** Controls how the `dark` variant is activated. */
  readonly darkMode?: DarkMode;
}

/** The output from one compiled style map. */
export interface CompileResult {
  /** Compiled runtime styles keyed by the input style name. */
  readonly styles: Readonly<Record<string, CompiledStyle>>;
  /** CSS rules generated for all candidates in this input. */
  readonly rules: readonly CssxRule[];
  /** Generated class names keyed by source candidate. */
  readonly classes: Readonly<Record<string, string>>;
  /** Parsed source candidates keyed by input style name. */
  readonly candidates: Readonly<Record<string, readonly string[]>>;
  /** Composite class names keyed by input style name. */
  readonly classNames: Readonly<Record<string, string>>;
  /** Winning atomic classes keyed by composite class name. */
  readonly composites: Readonly<Record<string, readonly string[]>>;
}

/** The output from several compiled style maps. */
export interface CompileMapsResult {
  /** Compiled results keyed by the input map name. */
  readonly styleMaps: Readonly<Record<string, CompiledStyleRecordMap>>;
  /** Shared CSS rules generated across every input map. */
  readonly rules: readonly CssxRule[];
}

/**
 * Compiles one map of static utility strings.
 *
 * @param input Style names and their utility strings.
 * @param options Compiler options.
 * @returns The compiled styles, class names, candidates, and CSS rules.
 *
 * The function rejects invalid utilities and invalid theme input.
 */
export async function compileStyleMap(
  input: Readonly<Record<string, string>>,
  options: CompilerOptions = {},
): Promise<CompileResult> {
  const records = compileStyleRecords(input, options);
  const candidates = Object.keys(records.classes);
  if (candidates.length === 0) {
    return {
      styles: records.styles,
      classes: records.classes,
      candidates: records.candidates,
      classNames: records.classNames,
      composites: records.composites,
      rules: [],
    };
  }
  const compiled = await compileUtilities(
    candidates,
    (candidate) => records.classes[candidate]!,
    options.theme,
    createSelectorAliases(records.composites),
    undefined,
    { darkMode: options.darkMode },
  );
  return {
    styles: records.styles,
    classes: records.classes,
    candidates: records.candidates,
    classNames: records.classNames,
    composites: records.composites,
    rules: [{ className: cssId(compiled.css), css: compiled.css }],
  };
}

/**
 * Compiles several style maps as one set of CSS.
 *
 * @param inputs Map names and their static utility maps.
 * @param options Compiler options.
 * @returns A compiled map for each input and the shared CSS rules.
 *
 * Shared resources, such as keyframes, are added once. The function rejects
 * invalid utilities and invalid theme input.
 */
export async function compileStyleMaps(
  inputs: Readonly<Record<string, Readonly<Record<string, string>>>>,
  options: CompilerOptions = {},
): Promise<CompileMapsResult> {
  const records = compileStyleRecordMaps(inputs, options);
  const candidates = Object.keys(records.classes);
  if (candidates.length === 0) {
    return { styleMaps: records.styleMaps, rules: [] };
  }
  const compiled = await compileUtilities(
    candidates,
    (candidate) => records.classes[candidate]!,
    options.theme,
    createSelectorAliases(records.composites),
    undefined,
    { darkMode: options.darkMode },
  );
  return {
    styleMaps: records.styleMaps,
    rules: [{ className: cssId(compiled.css), css: compiled.css }],
  };
}

/**
 * Joins unique CSS rules in a stable order.
 *
 * @param rules Generated CSS rules.
 * @param options Optional CSS layer settings.
 * @param options.layer CSS layer that wraps the generated rules.
 * @returns The final CSS string.
 */
export function serializeCss(rules: readonly CssxRule[], options: { readonly layer?: string } = {}): string {
  const css = [...new Set(rules.map((rule) => rule.css))].sort().join('');
  return css && options.layer ? `@layer ${options.layer}{${css}}` : css;
}

/**
 * Creates a stable compact identifier for one complete CSS payload.
 *
 * @param value CSS used as the identifier input.
 * @returns A deterministic CSSX class name.
 */
function cssId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `cssx-${(hash >>> 0).toString(36)}`;
}

/** Inverts composite-to-atom metadata for selector serialization. */
export function createSelectorAliases(
  composites: Readonly<Record<string, readonly string[]>>,
): Readonly<Record<string, readonly string[]>> {
  const aliases: Record<string, string[]> = Object.create(null) as Record<string, string[]>;
  for (const [composite, atomicClasses] of Object.entries(composites)) {
    for (const atomicClass of atomicClasses) {
      (aliases[atomicClass] ??= []).push(composite);
    }
  }
  return aliases;
}
