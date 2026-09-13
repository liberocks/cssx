import { describe, expect, it } from 'vitest';

import { resolveNumericSvgValue } from './resolve-numeric-svg-value';

describe('resolveNumericSvgValue', () => {
  it('accepts numeric and arbitrary SVG values', () => {
    expect(resolveNumericSvgValue('3')).toBe('3');
    expect(resolveNumericSvgValue('4.5')).toBe('4.5');
    expect(resolveNumericSvgValue('[4_8]')).toBe('4 8');
    expect(resolveNumericSvgValue('(--svg-value)')).toBe('var(--svg-value)');
  });

  it('rejects named and malformed values', () => {
    expect(resolveNumericSvgValue('auto')).toBeNull();
    expect(resolveNumericSvgValue('named-value')).toBeNull();
  });
});
