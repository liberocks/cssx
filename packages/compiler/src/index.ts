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
export { compileUtilities, describeUtilityRecipe } from './utilities';
export type {
  UtilityDeclaration,
  UtilityCompilation,
  UtilityCssEntry,
  UtilityRecipe,
  UtilityRecipeResources,
  UtilityWriteSet,
} from './utilities';
export type { CssxTheme, ThemeOutputMode } from './theme';

import { compileStyleRecords, compileStyleRecordMaps } from './conflicts';
import type {
  ClassNameAllocator,
  ClassNameOptions,
  CompiledStyle,
  CompiledStyleRecordMap,
  ReusabilityBudget,
} from './conflicts';
import { compileUtilities } from './utilities';

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
    (candidate) => records.classes[candidate] ?? candidate,
    options.theme,
    createSelectorAliases(records.composites),
  );
  return {
    styles: records.styles,
