import { expect, it } from 'vitest';
import { resolveDimensionValue } from './resolve-dimension-value';
import { parseTheme } from './theme';

it('resolves named, viewport, fractional, and spacing dimensions', () => {
  const theme = parseTheme('');

  expect(resolveDimensionValue('lg', false, theme, 'max-w')).toBe('32rem');
  expect(resolveDimensionValue('screen', false, theme, 'min-block')).toBe('100vb');
  expect(resolveDimensionValue('1/2', true, theme, 'w')).toBe('-50%');
  expect(resolveDimensionValue('2', false, theme, 'w')).toBe('calc(0.25rem * 2)');
  expect(resolveDimensionValue('1/0', false, theme, 'w')).toBeNull();
});
