import { describe, expect, it } from 'vitest';

import { negateCssValue } from './negate-css-value';

describe('negateCssValue', () => {
  it('negates numeric literals and expression values safely', () => {
    expect(negateCssValue('150ms')).toBe('-150ms');
    expect(negateCssValue('var(--time)')).toBe('calc(var(--time) * -1)');
  });
});
