import { expect, it } from 'vitest';

import { themeTokenName } from './theme-token-name';

it('applies an optional theme token prefix', () => {
  expect(themeTokenName({ tokens: {}, keyframes: {}, mode: 'inline', prefix: '' }, '--color-brand')).toBe(
    '--color-brand',
  );
  expect(themeTokenName({ tokens: {}, keyframes: {}, mode: 'reference', prefix: 'app' }, '--color-brand')).toBe(
    '--app-color-brand',
  );
});
