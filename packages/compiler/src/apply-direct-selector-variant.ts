import { PSEUDO_CLASS_VARIANTS, PSEUDO_ELEMENT_VARIANTS } from './pseudo-variant-selectors';
import type { VariantRenderState } from './variant-render-state';

/**
 * Applies generated-child, pseudo-class, or pseudo-element selector variants.
 *
 * @param variant Variant name to apply.
 * @param state Mutable selector state.
 * @returns Whether the variant belongs to this selector family.
 */
export function applyDirectSelectorVariant(variant: string, state: VariantRenderState): boolean {
  if (variant === '*') {
    state.selectors = state.selectors.map((selector) => `:is(${selector}${state.selectorSuffix} > *)`);
    state.selectorSuffix = '';
  } else if (variant === '**') {
    state.selectors = state.selectors.map((selector) => `:is(${selector}${state.selectorSuffix} *)`);
    state.selectorSuffix = '';
  } else if (variant === 'hover') {
    state.selectors = state.selectors.map((selector) => `${selector}:hover`);
    state.atRules.push('@media (hover: hover)');
  } else if (PSEUDO_CLASS_VARIANTS[variant]) {
    state.selectors = state.selectors.map((selector) => `${selector}:${PSEUDO_CLASS_VARIANTS[variant]}`);
  } else if (PSEUDO_ELEMENT_VARIANTS[variant]) {
    state.selectors = state.selectors.map((selector) => `${selector}::${PSEUDO_ELEMENT_VARIANTS[variant]}`);
    state.requiresPseudoContent ||= variant === 'before' || variant === 'after';
  } else {
    return false;
  }
  return true;
}
