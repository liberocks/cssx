import { expect, it } from 'vitest';

import { applyDirectSelectorVariant } from './apply-direct-selector-variant';
import type { VariantRenderState } from './variant-render-state';

/** Creates a fresh selector state for one direct-selector assertion. */
function createState(selectorSuffix = ''): VariantRenderState {
  return { selectors: ['.x'], selectorSuffix, atRules: [], requiresPseudoContent: false };
}

it('applies direct-child and descendant selectors with the active suffix', () => {
  const child = createState('::before');
  expect(applyDirectSelectorVariant('*', child)).toBe(true);
  expect(child.selectors).toEqual([':is(.x::before > *)']);
  expect(child.selectorSuffix).toBe('');

  const descendant = createState('::after');
  expect(applyDirectSelectorVariant('**', descendant)).toBe(true);
  expect(descendant.selectors).toEqual([':is(.x::after *)']);
  expect(descendant.selectorSuffix).toBe('');
});

it('adds the hover media condition and maps pseudo classes', () => {
  const hover = createState();
  expect(applyDirectSelectorVariant('hover', hover)).toBe(true);
  expect(hover.selectors).toEqual(['.x:hover']);
  expect(hover.atRules).toEqual(['@media (hover: hover)']);

  const focus = createState();
  expect(applyDirectSelectorVariant('focus-visible', focus)).toBe(true);
  expect(focus.selectors).toEqual(['.x:focus-visible']);
});

it('maps pseudo elements and only requests generated content for before and after', () => {
  const before = createState();
  expect(applyDirectSelectorVariant('before', before)).toBe(true);
  expect(before.selectors).toEqual(['.x::before']);
  expect(before.requiresPseudoContent).toBe(true);

  const marker = createState();
  expect(applyDirectSelectorVariant('marker', marker)).toBe(true);
  expect(marker.selectors).toEqual(['.x::marker']);
  expect(marker.requiresPseudoContent).toBe(false);
});

it('leaves unknown variants and state unchanged', () => {
  const state = createState();
  expect(applyDirectSelectorVariant('not-a-selector-variant', state)).toBe(false);
  expect(state).toEqual({ selectors: ['.x'], selectorSuffix: '', atRules: [], requiresPseudoContent: false });
});
