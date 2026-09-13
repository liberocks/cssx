import { expect, it } from 'vitest';

import { compileGradientStopUtility } from './compile-gradient-stop-utility';
import { parseTheme } from './theme';

it('resolves gradient stop positions and role-specific colors', () => {
  const theme = parseTheme();
  expect(compileGradientStopUtility('from-50%', theme)?.[0]).toEqual({
    property: '--cssx-gradient-from-position',
    value: '50%',
    semanticGroup: 'gradient-from',
  });
  expect(compileGradientStopUtility('from-red-500', theme)).toHaveLength(2);
  expect(compileGradientStopUtility('via-red-500/50', theme)).toHaveLength(2);
  expect(compileGradientStopUtility('to-blue-500', theme)).toHaveLength(1);
  expect(compileGradientStopUtility('via-[42%]', theme)?.[0]?.property).toBe('--cssx-gradient-via-position');
});

it('rejects malformed stops, unknown colors, and invalid opacity values', () => {
  const theme = parseTheme();
  expect(compileGradientStopUtility('from-101%', theme)).toBeNull();
  expect(compileGradientStopUtility('from-red-500/none', theme)).toBeNull();
  expect(compileGradientStopUtility('to-not-a-color', theme)).toBeNull();
  expect(compileGradientStopUtility('bg-linear-45', theme)).toBeNull();
});
