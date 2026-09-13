import { describe, expect, it } from 'vitest';

import { compilePrefixedTypographyUtility } from './compile-prefixed-typography-utility';
import { parseTheme } from './theme';

describe('compilePrefixedTypographyUtility', () => {
  const theme = parseTheme();

  it('compiles opacity, z-index, line-height, and text-indent values', () => {
    expect(compilePrefixedTypographyUtility('opacity-50', false, theme)).toEqual({ property: 'opacity', value: '0.5' });
    expect(compilePrefixedTypographyUtility('z-auto', false, theme)).toEqual({ property: 'z-index', value: 'auto' });
    expect(compilePrefixedTypographyUtility('leading-6', false, theme)).toEqual({
      property: 'line-height',
      value: 'calc(0.25rem * 6)',
    });
    expect(compilePrefixedTypographyUtility('leading-tight', false, theme)).toEqual({
      property: 'line-height',
      value: '1.25',
    });
    expect(compilePrefixedTypographyUtility('indent-2', true, theme)).toEqual({
      property: 'text-indent',
      value: 'calc(0.25rem * -2)',
    });
    expect(compilePrefixedTypographyUtility('indent-invalid', false, theme)).toBeNull();
  });

  it('compiles arbitrary font family and named, arbitrary, or custom tracking values', () => {
    expect(compilePrefixedTypographyUtility('font-[Inter]', false, theme)).toEqual({
      property: 'font-family',
      value: 'Inter',
    });
    expect(compilePrefixedTypographyUtility('tracking-widest', false, theme)?.property).toBe('letter-spacing');
    expect(compilePrefixedTypographyUtility('tracking-[0.03em]', false, theme)).toEqual({
      property: 'letter-spacing',
      value: '0.03em',
    });
    expect(compilePrefixedTypographyUtility('tracking-(--headline-spacing)', false, theme)).toEqual({
      property: 'letter-spacing',
      value: 'var(--headline-spacing)',
    });
    expect(compilePrefixedTypographyUtility('tracking-invalid', false, theme)).toBeNull();
  });
});
