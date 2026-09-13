import { describe, expect, it } from 'vitest';

import { compileOutlineUtility } from './compile-outline-utility';
import { parseTheme } from './theme';

describe('compileOutlineUtility', () => {
  const theme = parseTheme();

  it('compiles fixed outline styles and widths', () => {
    expect(compileOutlineUtility('outline', false, theme)).toEqual([
      { property: 'outline-style', value: 'solid' },
      { property: 'outline-width', value: '1px' },
    ]);
    expect(compileOutlineUtility('outline-hidden', false, theme)).toHaveLength(2);
    expect(compileOutlineUtility('outline-none', false, theme)).toEqual([{ property: 'outline-style', value: 'none' }]);
    expect(compileOutlineUtility('outline-dashed', false, theme)).toEqual([
      { property: 'outline-style', value: 'dashed' },
    ]);
    expect(compileOutlineUtility('outline-[3px]', false, theme)).toEqual([{ property: 'outline-width', value: '3px' }]);
  });

  it('resolves numbered and arbitrary offsets with sign handling', () => {
    expect(compileOutlineUtility('outline-offset-2', true, theme)).toEqual([
      { property: 'outline-offset', value: '-2px' },
    ]);
    expect(compileOutlineUtility('outline-offset-8', false, theme)).toEqual([
      { property: 'outline-offset', value: '8px' },
    ]);
    expect(compileOutlineUtility('outline-offset-[var(--offset)]', true, theme)).toEqual([
      { property: 'outline-offset', value: 'calc(var(--offset) * -1)' },
    ]);
    expect(compileOutlineUtility('outline-offset-[calc(1px+2px)]', true, theme)).toEqual([
      { property: 'outline-offset', value: 'calc(calc(1px+2px) * -1)' },
    ]);
    expect(compileOutlineUtility('outline-offset-0', true, theme)).toEqual([
      { property: 'outline-offset', value: '0' },
    ]);
    expect(compileOutlineUtility('outline-offset-1', false, theme)).toEqual([
      { property: 'outline-offset', value: '1px' },
    ]);
  });

  it('compiles colors and rejects invalid offsets, widths, and colors', () => {
    expect(compileOutlineUtility('outline-red-500/50', false, theme)?.[0]?.value).toContain('color-mix');
    expect(compileOutlineUtility('outline-red-500/101', false, theme)).toBeNull();
    expect(compileOutlineUtility('outline-offset-invalid', false, theme)).toBeNull();
    expect(compileOutlineUtility('outline-3', false, theme)).toBeNull();
    expect(compileOutlineUtility('outline-not-a-color', false, theme)).toBeNull();
    expect(compileOutlineUtility('not-outline-red-500', false, theme)).toBeNull();
  });
});
