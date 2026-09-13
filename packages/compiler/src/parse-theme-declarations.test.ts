import { expect, it } from 'vitest';

import { parseThemeDeclarations } from './parse-theme-declarations';

it('applies token declarations and namespace resets in order', () => {
  const tokens = { '--color-red': '#f00', '--color-blue': '#00f', '--spacing': '1rem' };

  parseThemeDeclarations('--color-red: #c00; --color-*: initial; --color-brand: #123;', tokens);

  expect(tokens).toEqual({ '--spacing': '1rem', '--color-brand': '#123' });
});

it('rejects malformed declarations and namespace resets without initial', () => {
  expect(() => parseThemeDeclarations('not-a-token', {})).toThrow('Invalid CSSX @theme declaration');
  expect(() => parseThemeDeclarations('--color-*: unset', { '--color-red': '#f00' })).toThrow('must use initial');
  expect(() => parseThemeDeclarations('--bad: value; injected: yes', {})).toThrow('Invalid CSSX @theme declaration');
});
