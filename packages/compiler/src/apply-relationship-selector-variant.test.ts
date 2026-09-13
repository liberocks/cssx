import { expect, it } from 'vitest';

import { applyRelationshipSelectorVariant } from './apply-relationship-selector-variant';
import type { VariantRenderState } from './variant-render-state';

/** Creates an isolated selector state for one relationship-variant assertion. */
function createState(): VariantRenderState {
  return { selectors: ['.x'], selectorSuffix: '', atRules: [], requiresPseudoContent: false };
}

it('applies custom state, group-state, and peer-state selectors', () => {
  const state = createState();
  expect(applyRelationshipSelectorVariant('state-[expanded]', state)).toBe(true);
  expect(state.selectors).toEqual(['.x:state(expanded)']);

  const group = createState();
  expect(applyRelationshipSelectorVariant('group-state-[expanded]', group)).toBe(true);
  expect(group.selectors).toEqual(['.group:state(expanded) .x']);

  const peer = createState();
  expect(applyRelationshipSelectorVariant('peer-state-[active]', peer)).toBe(true);
  expect(peer.selectors).toEqual(['.peer:state(active) ~ .x']);
});

it('applies named group and peer pseudo-class variants', () => {
  const group = createState();
  expect(applyRelationshipSelectorVariant('group-hover', group)).toBe(true);
  expect(group.selectors).toEqual(['.group:hover .x']);

  const peer = createState();
  expect(applyRelationshipSelectorVariant('peer-focus', peer)).toBe(true);
  expect(peer.selectors).toEqual(['.peer:focus ~ .x']);
});

it('applies arbitrary has selectors and named has, not, and in relationships', () => {
  const arbitraryHas = createState();
  expect(applyRelationshipSelectorVariant('has-[>img]', arbitraryHas)).toBe(true);
  expect(arbitraryHas.selectors).toEqual(['.x:has(>img)']);

  const has = createState();
  expect(applyRelationshipSelectorVariant('has-checked', has)).toBe(true);
  expect(has.selectors).toEqual(['.x:has(*:checked)']);

  const not = createState();
  expect(applyRelationshipSelectorVariant('not-checked', not)).toBe(true);
  expect(not.selectors).toEqual(['.x:not(*:checked)']);

  const inside = createState();
  expect(applyRelationshipSelectorVariant('in-focus', inside)).toBe(true);
  expect(inside.selectors).toEqual([':where(*:focus) .x']);
});

it('does not handle unknown relationship variants', () => {
  const state = createState();
  expect(applyRelationshipSelectorVariant('group-unknown', state)).toBe(false);
  expect(state.selectors).toEqual(['.x']);
});
