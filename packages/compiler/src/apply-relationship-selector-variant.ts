import { groupStateVariantName } from './group-state-variant-name';
import { isGroupStateVariant } from './is-group-state-variant';
import { isPeerStateVariant } from './is-peer-state-variant';
import { isStateVariant } from './is-state-variant';
import { peerStateVariantName } from './peer-state-variant-name';
import { PSEUDO_CLASS_VARIANTS } from './pseudo-variant-selectors';
import { stateVariantName } from './state-variant-name';
import type { VariantRenderState } from './variant-render-state';

/**
 * Applies state, group, peer, and relational pseudo-class variants.
 *
 * @param variant Variant name to apply.
 * @param state Mutable selector state.
 * @returns Whether the variant belongs to this selector family.
 */
export function applyRelationshipSelectorVariant(variant: string, state: VariantRenderState): boolean {
  const stateName = stateVariantName(variant);
  if (stateName) {
    state.selectors = state.selectors.map((selector) => `${selector}:state(${stateName})`);
  } else {
    const groupName = groupStateVariantName(variant);
    const peerName = peerStateVariantName(variant);
    if (groupName) {
      state.selectors = state.selectors.map((selector) => `.group:state(${groupName}) ${selector}`);
    } else if (peerName) {
      state.selectors = state.selectors.map((selector) => `.peer:state(${peerName}) ~ ${selector}`);
    } else if (isGroupStateVariant(variant)) {
      const pseudoClass = PSEUDO_CLASS_VARIANTS[variant.slice('group-'.length)]!;
      state.selectors = state.selectors.map((selector) => `.group:${pseudoClass} ${selector}`);
    } else if (isPeerStateVariant(variant)) {
      const pseudoClass = PSEUDO_CLASS_VARIANTS[variant.slice('peer-'.length)]!;
      state.selectors = state.selectors.map((selector) => `.peer:${pseudoClass} ~ ${selector}`);
    } else if (variant.startsWith('has-[') && variant.endsWith(']')) {
      state.selectors = state.selectors.map((selector) => `${selector}:has(${variant.slice(5, -1)})`);
    } else if (variant.startsWith('has-') && isStateVariant(variant.slice(4))) {
      const pseudoClass = PSEUDO_CLASS_VARIANTS[variant.slice(4)]!;
      state.selectors = state.selectors.map((selector) => `${selector}:has(*:${pseudoClass})`);
    } else if (variant.startsWith('not-') && isStateVariant(variant.slice(4))) {
      const pseudoClass = PSEUDO_CLASS_VARIANTS[variant.slice(4)]!;
      state.selectors = state.selectors.map((selector) => `${selector}:not(*:${pseudoClass})`);
    } else if (variant.startsWith('in-') && isStateVariant(variant.slice(3))) {
      const pseudoClass = PSEUDO_CLASS_VARIANTS[variant.slice(3)]!;
      state.selectors = state.selectors.map((selector) => `:where(*:${pseudoClass}) ${selector}`);
    } else {
      return false;
    }
  }
  return true;
}
