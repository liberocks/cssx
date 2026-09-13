import { expect, it } from 'vitest';

import { resolveSpacingValue } from './resolve-spacing-value';
import { parseTheme } from './theme';

it('resolves special, arbitrary, and themed spacing values', () => {
  const theme = parseTheme('');
  expect(resolveSpacingValue('px', true, theme)).toBe('-1px');
  expect(resolveSpacingValue('[3rem]', false, theme)).toBe('3rem');
  expect(resolveSpacingValue('2', false, theme)).toBe('calc(0.25rem * 2)');
});
