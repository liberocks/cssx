import { describe, expect, it } from 'vitest';

import { resolveViewTransitionVariant } from './resolve-view-transition-variant';

describe('resolveViewTransitionVariant', () => {
  it('resolves wildcard, class, and named transition targets', () => {
    expect(resolveViewTransitionVariant('vt-group-[*]')).toBe('::view-transition-group(*)');
    expect(resolveViewTransitionVariant('vt-image-pair-[.hero_card]')).toBe('::view-transition-image-pair(.hero_card)');
    expect(resolveViewTransitionVariant('vt-old-[card]')).toBe('::view-transition-old(card)');
  });

  it('rejects unsupported kinds, malformed targets, and reserved identifiers', () => {
    for (const variant of ['vt-before-[card]', 'vt-old-[]', 'vt-new-[.123card]', 'vt-old-[none]', 'vt-group-[a b]']) {
      expect(resolveViewTransitionVariant(variant), variant).toBeNull();
    }
  });
});
