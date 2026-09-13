import { expect, it } from 'vitest';

import { compileMaskGradientUtility } from './compile-mask-gradient-utility';
import { parseTheme } from './theme';

const theme = parseTheme();

it('composes gradient positions, theme colors, and their sinks', () => {
  expect(compileMaskGradientUtility('mask-x-from-20%', theme)?.[0]).toMatchObject({
    property: '--cssx-mask-x-from-position',
    value: '20%',
    semanticGroup: 'mask-x-from',
  });
  expect(compileMaskGradientUtility('mask-r-to-red-500/50', theme)?.[0]?.value).toContain('color-mix');
  expect(compileMaskGradientUtility('mask-radial-from-blue-500', theme)).toHaveLength(3);
});

it('compiles supported mask angles and rejects invalid gradient stops', () => {
  expect(compileMaskGradientUtility('mask-linear-45', theme)?.[0]).toMatchObject({
    property: '--cssx-mask-linear-angle',
    value: '45deg',
  });
  expect(compileMaskGradientUtility('mask-conic-to-30%', theme)?.[0]?.value).toBe('30%');
  expect(compileMaskGradientUtility('mask-x-from-invalid', theme)).toBeNull();
  expect(compileMaskGradientUtility('mask-x-to-red-500/101', theme)).toBeNull();
  expect(compileMaskGradientUtility('mask-none', theme)).toBeNull();
});
