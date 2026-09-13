import { describe, expect, it } from 'vitest';

import { compileColorUtility } from './compile-color-utility';
import { parseTheme } from './theme';

describe('compileColorUtility', () => {
  const theme = parseTheme();
  const firstDeclaration = (utility: string) => {
    const declarations = compileColorUtility(utility, theme);
    return Array.isArray(declarations) ? declarations[0] : declarations;
  };

  it('compiles color families and directional border colors', () => {
    expect(firstDeclaration('bg-red-500/50')?.value).toContain('color-mix');
    expect(firstDeclaration('text-blue-500')?.property).toBe('color');
    expect(compileColorUtility('border-x-red-500', theme)).toHaveLength(2);
    expect(firstDeclaration('border-s-red-500')?.property).toBe('border-inline-start-color');
    expect(firstDeclaration('accent-red-500')?.property).toBe('accent-color');
    expect(firstDeclaration('caret-red-500')?.property).toBe('caret-color');
    expect(firstDeclaration('fill-red-500')?.property).toBe('fill');
    expect(firstDeclaration('stroke-red-500')?.property).toBe('stroke');
  });

  it('resolves arbitrary font and image values and rejects invalid candidates', () => {
    expect(compileColorUtility('text-[length:12px]', theme)).toEqual({ property: 'font-size', value: '12px' });
    expect(compileColorUtility('bg-[image:url("/image.svg")]', theme)).toEqual({
      property: 'background-image',
      value: 'url("/image.svg")',
    });
    expect(compileColorUtility('text-xs', theme)).toBeNull();
    expect(compileColorUtility('bg-red-500/101', theme)).toBeNull();
    expect(compileColorUtility('text-not-a-color', theme)).toBeNull();
    expect(compileColorUtility('not-a-color-utility', theme)).toBeNull();
  });
});
