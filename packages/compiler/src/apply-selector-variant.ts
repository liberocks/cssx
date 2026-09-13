import { applyArbitrarySelectorVariant } from './apply-arbitrary-selector-variant';
import { applyDirectSelectorVariant } from './apply-direct-selector-variant';
import { applyRelationshipSelectorVariant } from './apply-relationship-selector-variant';
import type { VariantRenderState } from './variant-render-state';

/**
 * Applies a selector-oriented built-in variant to the active render state.
 *
 * @param variant Variant name to apply.
 * @param state Mutable selectors, suffix, and conditions for this candidate.
 * @returns Whether a selector variant recognized and applied the input.
 * @throws When an arbitrary selector does not safely contain a nesting node.
 */
export function applySelectorVariant(variant: string, state: VariantRenderState): boolean {
  return (
    applyDirectSelectorVariant(variant, state) ||
    applyRelationshipSelectorVariant(variant, state) ||
    applyArbitrarySelectorVariant(variant, state)
  );
}
