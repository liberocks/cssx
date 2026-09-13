import { expect, it } from 'vitest';

import { compileOutlineColorUtility } from './compile-outline-color-utility';
import { parseTheme } from './theme';

const theme = parseTheme();

it('resolves outline colors and opacity modifiers', () => {
  expect(compileOutlineColorUtility('outline-red-500', theme)).toEqual({
    property: 'outline-color',
    value: 'oklch(63.71% 0.237 25.331)',
  });
  expect(compileOutlineColorUtility('outline-red-500/50', theme)?.value).toContain('color-mix');
  expect(compileOutlineColorUtility('outline-red-500/101', theme)).toBeNull();
});

it('returns null for utilities outside the outline color family', () => {
  expect(compileOutlineColorUtility('outline-offset-2', theme)).toBeNull();
  expect(compileOutlineColorUtility('outline-not-a-color', theme)).toBeNull();
});
