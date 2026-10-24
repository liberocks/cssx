export { splitCandidateList } from './candidates/candidate';
export type { ClassNameAllocator, ClassNameOptions } from './atoms/class-name';
export type { ClassNameAllocatorSnapshot } from './atoms/class-name';
export { createClassNameAllocator } from './atoms/class-name-allocator';
export { restoreClassNameAllocator } from './atoms/restore-class-name-allocator';
export { snapshotClassNameAllocator } from './atoms/snapshot-class-name-allocator';
export { classifyUtility } from './utilities/registry/classify-utility';
export type { CompileMapsResult } from './composition/compile-maps-result';
export type { CompileResult } from './compiler/compile-result';
export { compileStyleMap } from './composition/compile-style-map';
export { compileStyleMaps } from './composition/compile-style-maps';
export { compileStyleRecords } from './composition/compile-style-records';
export type { CompiledStyle } from './shared/compiled-style';
export type { CompiledStyleRecordMap, CompiledStyleRecordMaps } from './composition/compiled-style-record-maps';
export { compileStyleRecordMaps } from './composition/compiled-style-record-maps';
export type { CompiledUtility } from './atoms/compiled-utility';
export type { CompilerOptions } from './compiler/compiler-options';
export { composeCompiledStyles } from './composition/compose-compiled-styles';
export type { StyleComposition } from './composition/compose-compiled-styles';
export { createSelectorAliases } from './atoms/create-selector-aliases';
export { cssId } from './css/css-id';
export type { CssxRule } from './css/cssx-rule';
export { mergeCompiledStyles } from './composition/merge-compiled-styles';
export type { ReusabilityBudget } from './composition/reusability';
export { serializeCss } from './css/serialize-css';
export type { StyleCompilerOptions } from './compiler/style-compiler';
export type { CssxTheme, ThemeOutputMode } from './theme/theme';
export { parseTheme } from './theme/theme';
export {
  compileSourceUtilities,
  compileUtilities,
  describeUtilityRecipe,
  validateUtilityCandidate,
} from './compiler/utilities';
export type {
  UtilityDeclaration,
  UtilityCompilation,
  UtilityCssEntry,
  UtilityRecipe,
  UtilityRecipeResources,
  UtilityWriteSet,
} from './compiler/utilities';
export type { UtilityConflictRecord } from './utilities/registry/utility-conflict-record';
export type { DarkMode } from './variants/apply-variants';
