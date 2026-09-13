import { normalizeArbitrarySelector } from './normalize-arbitrary-selector';
import { replaceNestingSelectors } from './selector';
import type { VariantRenderState } from './variant-render-state';

/**
 * Applies arbitrary selector, data, and ARIA variants.
 *
 * @param variant Variant name to apply.
 * @param state Mutable selector state.
 * @returns Whether the variant belongs to this selector family.
 * @throws When an arbitrary selector does not contain a nesting node.
 */
export function applyArbitrarySelectorVariant(variant: string, state: VariantRenderState): boolean {
  if (variant.startsWith('[') && variant.endsWith(']')) {
    const arbitraryVariant = variant.slice(1, -1);
    if (arbitraryVariant.startsWith('@supports') || arbitraryVariant.startsWith('@media')) {
      return false;
    }
    const rewrittenSelectors = state.selectors.map((selector) =>
      replaceNestingSelectors(normalizeArbitrarySelector(arbitraryVariant), `${selector}${state.selectorSuffix}`),
    );
    if (rewrittenSelectors.some((selector) => selector === null)) {
      throw new Error(`CSSX arbitrary selector variant "${variant}" must contain "&".`);
    }
    state.selectors = rewrittenSelectors.filter((selector): selector is string => selector !== null);
    state.selectorSuffix = '';
  } else if (variant.startsWith('data-[') && variant.endsWith(']')) {
    state.selectors = state.selectors.map((selector) => `${selector}[data-${variant.slice(6, -1)}]`);
  } else if (/^data-[a-z][a-z0-9_-]*$/i.test(variant)) {
    state.selectors = state.selectors.map((selector) => `${selector}[${variant}]`);
  } else if (variant.startsWith('aria-[') && variant.endsWith(']')) {
    state.selectors = state.selectors.map((selector) => `${selector}[aria-${variant.slice(6, -1)}]`);
  } else if (variant.startsWith('aria-')) {
    state.selectors = state.selectors.map((selector) => `${selector}[aria-${variant.slice(5)}="true"]`);
  } else {
    return false;
  }
  return true;
}
