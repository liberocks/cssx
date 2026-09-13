import { describe, expect, it } from 'vitest';

import { validateVariantCombination } from './validate-variant-combination';

describe('validateVariantCombination', () => {
  const transition = 'vt-old-[card]';

  it('accepts compositions without view-transition variants and compatible media rules', () => {
    expect(() => validateVariantCombination(['hover', 'focus'])).not.toThrow();
    expect(() => validateVariantCombination([transition, '[@supports(display:grid)]'])).not.toThrow();
    expect(() => validateVariantCombination([transition, '[@media(width>40rem)]'])).not.toThrow();
  });

  it('rejects multiple view-transition variants and incompatible selector relationships', () => {
    expect(() => validateVariantCombination([transition, 'vt-new-[card]'])).toThrow('cannot compose');
    for (const variant of [
      '*',
      '**',
      'before',
      'group-hover',
      'peer-focus',
      'has-checked',
      'in-focus',
      '[&:not(:empty)]',
    ]) {
      expect(() => validateVariantCombination([variant, transition]), variant).toThrow('cannot compose');
    }
  });
});
