import { describe, expect, it } from 'vitest';

import { applySelectorVariant } from './apply-selector-variant';
import type { VariantRenderState } from './variant-render-state';

/** Creates a fresh selector state for one focused variant assertion. */
function createState(): VariantRenderState {
  return { selectors: ['.x'], selectorSuffix: '', atRules: [], requiresPseudoContent: false };
}

describe('applySelectorVariant', () => {
  it('applies generated-child, pseudo-class, and pseudo-element selectors', () => {
    const child = createState();
    expect(applySelectorVariant('*', child)).toBe(true);
    expect(child.selectors).toEqual([':is(.x > *)']);

    const pseudoClass = createState();
    expect(applySelectorVariant('focus-visible', pseudoClass)).toBe(true);
    expect(pseudoClass.selectors).toEqual(['.x:focus-visible']);

    const pseudoElement = createState();
    expect(applySelectorVariant('before', pseudoElement)).toBe(true);
    expect(pseudoElement.selectors).toEqual(['.x::before']);
    expect(pseudoElement.requiresPseudoContent).toBe(true);
  });

  it('applies state, group, peer, and relationship selectors', () => {
    const state = createState();
    expect(applySelectorVariant('state-[expanded]', state)).toBe(true);
    expect(state.selectors).toEqual(['.x:state(expanded)']);

    const group = createState();
    expect(applySelectorVariant('group-hover', group)).toBe(true);
    expect(group.selectors).toEqual(['.group:hover .x']);

    const peer = createState();
    expect(applySelectorVariant('peer-state-[active]', peer)).toBe(true);
    expect(peer.selectors).toEqual(['.peer:state(active) ~ .x']);

    const has = createState();
    expect(applySelectorVariant('has-checked', has)).toBe(true);
    expect(has.selectors).toEqual(['.x:has(*:checked)']);
  });

  it('applies arbitrary, data, and ARIA selectors while leaving condition variants unhandled', () => {
    const arbitrary = createState();
    expect(applySelectorVariant('[&:is(.card)]', arbitrary)).toBe(true);
    expect(arbitrary.selectors).toEqual(['.x:is(.card)']);

    const attributes = createState();
    expect(applySelectorVariant('data-[mode=compact]', attributes)).toBe(true);
    expect(applySelectorVariant('aria-expanded', attributes)).toBe(true);
    expect(attributes.selectors).toEqual(['.x[data-mode=compact][aria-expanded="true"]']);

    const condition = createState();
    expect(applySelectorVariant('[@media (width >= 40rem)]', condition)).toBe(false);
    expect(condition.atRules).toEqual([]);
    expect(applySelectorVariant('unknown', condition)).toBe(false);
  });

  it('rejects arbitrary selector variants that omit nesting', () => {
    expect(() => applySelectorVariant('[.card]', createState())).toThrow('must contain "&"');
  });
});
