import { groupStateVariantName } from './group-state-variant-name';
import { isGroupStateVariant } from './is-group-state-variant';
import { isPeerStateVariant } from './is-peer-state-variant';
import { isStateVariant } from './is-state-variant';
import { normalizeArbitrarySelector } from './normalize-arbitrary-selector';
import { peerStateVariantName } from './peer-state-variant-name';
import { PSEUDO_CLASS_VARIANTS, PSEUDO_ELEMENT_VARIANTS } from './pseudo-variant-selectors';
import { replaceNestingSelectors } from './selector';
import { stateVariantName } from './state-variant-name';
import type { VariantRenderState } from './variant-render-state';

/**
 * Applies a selector-oriented built-in variant to the active render state.
 *
 * @param variant Variant name to apply.
 * @param state Mutable selectors, suffix, and conditions for this candidate.
 * @returns Whether this helper recognized and applied the variant.
 * @throws When an arbitrary selector does not safely contain a nesting node.
 */
export function applySelectorVariant(variant: string, state: VariantRenderState): boolean {
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
  } else if (stateVariantName(variant)) {
    state.selectors = state.selectors.map((selector) => `${selector}:state(${stateVariantName(variant)})`);
  } else if (groupStateVariantName(variant)) {
    state.selectors = state.selectors.map((selector) => `.group:state(${groupStateVariantName(variant)}) ${selector}`);
  } else if (peerStateVariantName(variant)) {
    state.selectors = state.selectors.map((selector) => `.peer:state(${peerStateVariantName(variant)}) ~ ${selector}`);
  } else if (isGroupStateVariant(variant)) {
    const stateName = variant.slice('group-'.length);
    state.selectors = state.selectors.map((selector) => `.group:${PSEUDO_CLASS_VARIANTS[stateName]!} ${selector}`);
  } else if (isPeerStateVariant(variant)) {
    const stateName = variant.slice('peer-'.length);
    state.selectors = state.selectors.map((selector) => `.peer:${PSEUDO_CLASS_VARIANTS[stateName]!} ~ ${selector}`);
  } else if (variant.startsWith('has-[') && variant.endsWith(']')) {
    state.selectors = state.selectors.map((selector) => `${selector}:has(${variant.slice(5, -1)})`);
  } else if (variant.startsWith('has-') && isStateVariant(variant.slice(4))) {
    const stateName = variant.slice(4);
    state.selectors = state.selectors.map((selector) => `${selector}:has(*:${PSEUDO_CLASS_VARIANTS[stateName]!})`);
  } else if (variant.startsWith('not-') && isStateVariant(variant.slice(4))) {
    const stateName = variant.slice(4);
    state.selectors = state.selectors.map((selector) => `${selector}:not(*:${PSEUDO_CLASS_VARIANTS[stateName]!})`);
  } else if (variant.startsWith('in-') && isStateVariant(variant.slice(3))) {
    const stateName = variant.slice(3);
    state.selectors = state.selectors.map((selector) => `:where(*:${PSEUDO_CLASS_VARIANTS[stateName]!}) ${selector}`);
  } else if (variant.startsWith('[') && variant.endsWith(']')) {
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
