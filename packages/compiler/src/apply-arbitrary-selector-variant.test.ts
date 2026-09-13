import { expect, it } from 'vitest';

import { applyArbitrarySelectorVariant } from './apply-arbitrary-selector-variant';
import type { VariantRenderState } from './variant-render-state';

/** Creates an isolated selector state for one arbitrary-variant assertion. */
function createState(selectorSuffix = ''): VariantRenderState {
  return { selectors: ['.x'], selectorSuffix, atRules: [], requiresPseudoContent: false };
}

it('replaces nesting in arbitrary selectors and consumes selector suffixes', () => {
  const state = createState('::before');

  expect(applyArbitrarySelectorVariant('[&:is(.card)]', state)).toBe(true);
  expect(state.selectors).toEqual(['.x::before:is(.card)']);
  expect(state.selectorSuffix).toBe('');
});

it('leaves arbitrary condition variants for the condition resolver', () => {
  const state = createState();

  expect(applyArbitrarySelectorVariant('[@supports(display:grid)]', state)).toBe(false);
  expect(applyArbitrarySelectorVariant('[@media(width>40rem)]', state)).toBe(false);
  expect(state.selectors).toEqual(['.x']);
});

it('rejects arbitrary selectors that do not contain nesting', () => {
  expect(() => applyArbitrarySelectorVariant('[.card]', createState())).toThrow('must contain "&"');
});

it('renders data and ARIA attribute selectors in arbitrary and named forms', () => {
  const state = createState();

  expect(applyArbitrarySelectorVariant('data-[mode=compact]', state)).toBe(true);
  expect(applyArbitrarySelectorVariant('data-active', state)).toBe(true);
  expect(applyArbitrarySelectorVariant('aria-[label=dialog]', state)).toBe(true);
  expect(applyArbitrarySelectorVariant('aria-expanded', state)).toBe(true);
  expect(state.selectors).toEqual(['.x[data-mode=compact][data-active][aria-label=dialog][aria-expanded="true"]']);
});

it('does not handle unrelated variants', () => {
  const state = createState();
  expect(applyArbitrarySelectorVariant('unknown', state)).toBe(false);
  expect(state.selectors).toEqual(['.x']);
});
