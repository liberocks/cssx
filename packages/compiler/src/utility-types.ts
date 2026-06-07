/** One CSS declaration emitted by a utility recipe. */
export interface UtilityDeclaration {
  /** CSS property to emit. */
  readonly property: string;
  /** CSS value to emit. */
  value: string;
  /** Optional selector suffix shared by declarations in one atom. */
  readonly selectorSuffix?: string;
  /** Optional at-rule that wraps this declaration. */
  readonly atRule?: string;
  /** Semantic write group used when compiled styles are merged. */
  readonly semanticGroup?: string;
  /** Semantic groups cleared before this declaration is applied. */
  readonly semanticConflicts?: readonly string[];
}
