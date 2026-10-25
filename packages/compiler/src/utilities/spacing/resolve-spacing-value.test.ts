import { expect, it } from 'vitest';

import { parseTheme } from '../../theme/theme';
import { resolveSpacingValue } from './resolve-spacing-value';

it('resolves special, arbitrary, and themed spacing values', () => {
  const theme = parseTheme('');
  expect(resolveSpacingValue('px', true, theme)).toBe('-1px');
  expect(resolveSpacingValue('[3rem]', false, theme)).toBe('3rem');
  expect(resolveSpacingValue('2', false, theme)).toBe('calc(0.25rem * 2)');
});

it('decodes whitespace aliases in arbitrary spacing values', () => {
  const theme = parseTheme('');
  expect(resolveSpacingValue('[calc(100vw - 2rem)]', false, theme)).toBe('calc(100vw - 2rem)');
  expect(resolveSpacingValue('[calc(100vw_-_2rem)]', false, theme)).toBe('calc(100vw - 2rem)');
  expect(resolveSpacingValue('[calc(var(--size\\_token) - 2rem)]', false, theme)).toBe(
    'calc(var(--size_token) - 2rem)',
  );
});
