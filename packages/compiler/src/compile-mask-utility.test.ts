import { describe, expect, it } from 'vitest';

import { compileMaskUtility } from './compile-mask-utility';
import { parseTheme } from './theme';

describe('compileMaskUtility', () => {
  const theme = parseTheme();
  const firstDeclaration = (utility: string) => {
    const declarations = compileMaskUtility(utility, theme);
    return Array.isArray(declarations) ? declarations[0] : declarations;
  };

  it('compiles fixed and arbitrary mask image and placement utilities', () => {
    expect(compileMaskUtility('mask-none', theme)).toEqual({ property: 'mask-image', value: 'none' });
    expect(compileMaskUtility('mask-position-[center]', theme)).toEqual({
      property: 'mask-position',
      value: 'center',
    });
    expect(compileMaskUtility('mask-size-[auto_100%]', theme)).toEqual({
      property: 'mask-size',
      value: 'auto 100%',
    });
    expect(compileMaskUtility('mask-[url("/mask.svg")]', theme)).toEqual({
      property: 'mask-image',
      value: 'url("/mask.svg")',
    });
    expect(compileMaskUtility('mask-repeat-x', theme)).toEqual({ property: 'mask-repeat', value: 'repeat-x' });
  });

  it('composes gradient stop positions, colors, and angles', () => {
    expect(firstDeclaration('mask-x-from-20%')).toMatchObject({
      property: '--cssx-mask-x-from-position',
      value: '20%',
    });
    expect(firstDeclaration('mask-r-to-red-500/50')?.value).toContain('color-mix');
    expect(firstDeclaration('mask-linear-45')).toMatchObject({
      property: '--cssx-mask-linear-angle',
      value: '45deg',
    });
    expect(compileMaskUtility('mask-radial-from-blue-500', theme)).toHaveLength(3);
    expect(firstDeclaration('mask-conic-to-30%')?.value).toBe('30%');
  });

  it('rejects unknown utilities, invalid stops, and invalid opacity modifiers', () => {
    expect(compileMaskUtility('not-a-mask', theme)).toBeNull();
    expect(compileMaskUtility('mask-x-from-invalid', theme)).toBeNull();
    expect(compileMaskUtility('mask-x-to-red-500/101', theme)).toBeNull();
  });
});
