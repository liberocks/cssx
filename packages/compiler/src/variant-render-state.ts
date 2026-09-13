/** Mutable selector and condition state shared by variant rendering helpers. */
export interface VariantRenderState {
  /** Selectors being transformed by the ordered variant list. */
  selectors: string[];
  /** Pseudo-element or other suffix applied to each final selector. */
  selectorSuffix: string;
  /** At-rules applied around the rendered utility rules. */
  atRules: string[];
  /** Whether before/after variants require the content custom property. */
  requiresPseudoContent: boolean;
}
