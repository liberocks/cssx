import { expect, it } from 'vitest';

import { parseTheme } from '../theme/theme';
import { resolveDimensionValue } from './resolve-dimension-value';

it('resolves named, viewport, fractional, and spacing dimensions', () => {
  const theme = parseTheme('');

  expect(resolveDimensionValue('lg', false, theme, 'max-w')).toBe('32rem');
  expect(resolveDimensionValue('screen', false, theme, 'min-block')).toBe('100vb');
  expect(resolveDimensionValue('1/2', true, theme, 'w')).toBe('-50%');
  expect(resolveDimensionValue('2', false, theme, 'w')).toBe('calc(0.25rem * 2)');
  expect(resolveDimensionValue('(--available-height)', false, theme, 'max-h')).toBe('var(--available-height)');
  expect(resolveDimensionValue('(--size)', true, theme, 'h')).toBe('calc(-1 * var(--size))');
  expect(resolveDimensionValue('1/0', false, theme, 'w')).toBeNull();
});
