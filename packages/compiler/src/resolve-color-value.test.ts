import { expect, it } from 'vitest';
import { resolveColorValue } from './resolve-color-value';
import { parseTheme } from './theme';

it('resolves arbitrary and theme-backed colors', () => {
  const theme = parseTheme('@theme { --color-brand: #123456; }');

  expect(resolveColorValue('[rgb(1 2 3)]', theme)).toBe('rgb(1 2 3)');
  expect(resolveColorValue('brand', theme)).toBe('#123456');
  expect(resolveColorValue('missing', theme)).toBeNull();
});
