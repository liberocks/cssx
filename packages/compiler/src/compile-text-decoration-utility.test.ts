import { describe, expect, it } from 'vitest';

import { compileTextDecorationUtility } from './compile-text-decoration-utility';
import { parseTheme } from './theme';

describe('compileTextDecorationUtility', () => {
  const theme = parseTheme();

  it('compiles underline offsets, styles, thicknesses, and colors', () => {
    expect(compileTextDecorationUtility('underline-offset-auto', theme)).toEqual({
      property: 'text-underline-offset',
      value: 'auto',
    });
    expect(compileTextDecorationUtility('underline-offset-(--offset)', theme)?.value).toBe('var(--offset)');
    expect(compileTextDecorationUtility('underline-offset-2', theme)?.value).toContain('0.25rem');
    expect(compileTextDecorationUtility('decoration-wavy', theme)).toEqual({
      property: 'text-decoration-style',
      value: 'wavy',
    });
    expect(compileTextDecorationUtility('decoration-auto', theme)?.value).toBe('auto');
    expect(compileTextDecorationUtility('decoration-from-font', theme)?.value).toBe('from-font');
    expect(compileTextDecorationUtility('decoration-3', theme)?.value).toBe('3px');
    expect(compileTextDecorationUtility('decoration-[3px]', theme)?.value).toBe('3px');
    expect(compileTextDecorationUtility('decoration-red-500', theme)?.value).toContain('oklch');
  });

  it('handles empty theme values and rejects malformed candidates', () => {
    const emptyTheme = { tokens: {}, keyframes: {}, mode: 'inline' as const, prefix: '' };
    expect(compileTextDecorationUtility('underline-offset-2', emptyTheme)?.value).toBe('');
    expect(compileTextDecorationUtility('decoration-invalid', theme)).toBeNull();
    expect(compileTextDecorationUtility('not-decoration-utility', theme)).toBeNull();
  });
});
