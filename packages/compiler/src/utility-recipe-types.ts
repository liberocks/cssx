import type { ParsedCandidate } from './candidate-types';
import type { UtilitySemantics } from './semantics';
import type { UtilityDeclaration } from './utility-types';

/** CSS and metadata created from utility strings. */
export interface UtilityCompilation {
  /** Complete generated CSS, including prefix CSS. */
  readonly css: string;
  /** Theme CSS and shared CSS resources. */
  readonly prefixCss: string;
  /** Utility CSS entries in output order. */
  readonly entries: readonly UtilityCssEntry[];
  /** Generated class string keyed by source candidate. */
  readonly classes: Readonly<Record<string, string>>;
}

/** One utility string and its generated CSS. */
export interface UtilityCssEntry {
  /** Source utility candidate. */
  readonly candidate: string;
  /** CSS emitted for this candidate and one generated class. */
  readonly css: string;
}

/** Shared CSS resources needed by a utility. */
export interface UtilityRecipeResources {
  /** Keyframe names required by the utility. */
  readonly keyframes: readonly string[];
  /** Custom properties that must be registered before emitting CSS. */
  readonly properties: readonly string[];
}

/** Style groups written by one utility part. */
export interface UtilityWriteSet {
  /** Semantic group written by this atom. */
  readonly group: string;
  /** Semantic groups cleared by this atom. */
  readonly conflicts: readonly string[];
}

/** The compiled parts and metadata for one utility. */
export interface UtilityRecipe {
  /** Source utility candidate. */
  readonly candidate: string;
  /** Separate declaration atoms that can receive separate class names. */
  readonly atoms: readonly (readonly UtilityDeclaration[])[];
  /** Shared CSS resources required by the utility. */
  readonly resources: UtilityRecipeResources;
  /** Semantic write behavior for each declaration atom. */
  readonly writes: readonly UtilityWriteSet[];
  /** Precomputed CSS for a data-backed recipe, if one is required. */
  readonly fallbackCss?: string;
}

/** Internal CSS entry before final ordering and result projection. */
export interface CompiledUtility {
  /** Source utility candidate. */
  readonly candidate: string;
  /** Generated class name for this atom. */
  readonly className: string;
  /** CSS emitted for this atom. */
  readonly css: string;
  /** Stable cascade sort key. */
  readonly order: string;
}

/** Internal parsed and classified recipe data reused during CSS serialization. */
export interface ResolvedUtilityRecipe {
  readonly recipe: UtilityRecipe;
  readonly parsedCandidate: ParsedCandidate;
  readonly semantics: UtilitySemantics;
}