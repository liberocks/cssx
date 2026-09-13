import { describe, expect, it } from 'vitest';

import { compileModernUtility } from './compile-modern-utility';
import { parseTheme } from './theme';

describe('compileModernUtility', () => {
  const theme = parseTheme();

  it('compiles fixed platform declarations and arbitrary containment', () => {
    expect(compileModernUtility('contain-layout', theme)).toEqual({ property: 'contain', value: 'layout' });
    expect(compileModernUtility('contain-[layout_paint]', theme)).toEqual({
      property: 'contain',
      value: 'layout paint',
    });
    expect(compileModernUtility('writing-vertical-rl', theme)).toEqual({
      property: 'writing-mode',
      value: 'vertical-rl',
    });
  });

  it('compiles intrinsic sizes and numeric or arbitrary SVG values', () => {
    expect(compileModernUtility('contain-intrinsic-size-none', theme)).toEqual({
      property: 'contain-intrinsic-size',
      value: 'none',
    });
    expect(compileModernUtility('contain-intrinsic-inline-size-2', theme)).toEqual({
      property: 'contain-intrinsic-inline-size',
      value: 'calc(0.25rem * 2)',
    });
    expect(compileModernUtility('stroke-dasharray-[4_8]', theme)).toEqual({
      property: 'stroke-dasharray',
      value: '4 8',
    });
    expect(compileModernUtility('stroke-dashoffset-3', theme)).toEqual({ property: 'stroke-dashoffset', value: '3' });
    expect(
      compileModernUtility('contain-intrinsic-size-custom', {
        ...theme,
        tokens: { ...theme.tokens, '--contain-intrinsic-size-custom': '24px' },
      }),
    ).toEqual({ property: 'contain-intrinsic-size', value: '24px' });
    expect(compileModernUtility('contain-intrinsic-size-(--custom)', theme)?.value).toBe('var(--custom)');
  });

  it('rejects unknown modern utility values', () => {
    expect(compileModernUtility('contain-intrinsic-size-unknown', theme)).toBeNull();
    expect(compileModernUtility('stroke-dasharray-invalid', theme)).toBeNull();
    expect(compileModernUtility('unknown-platform-utility', theme)).toBeNull();
  });
});
