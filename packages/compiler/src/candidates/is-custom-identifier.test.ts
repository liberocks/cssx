import { describe, expect, it } from 'vitest';

import { isCustomIdentifier } from './is-custom-identifier';

describe('isCustomIdentifier', () => {
  it('accepts CSS identifier-safe names outside reserved words', () => {
    expect(isCustomIdentifier('hero-card', [])).toBe(true);
    expect(isCustomIdentifier('_private2', [])).toBe(true);
  });

  it('rejects invalid starts, CSS-wide keywords, and caller-reserved names', () => {
    expect(isCustomIdentifier('2hero', [])).toBe(false);
    expect(isCustomIdentifier('inherit', [])).toBe(false);
    expect(isCustomIdentifier('match-element', ['match-element'])).toBe(false);
  });
});
