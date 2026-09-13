import { expect, it } from 'vitest';

import { escapeCssIdentifier } from './escape-css-identifier';

it('keeps letters, digits, hyphens, underscores, and non-ASCII characters unescaped', () => {
  expect(escapeCssIdentifier('abc-123_def')).toBe('abc-123_def');
  expect(escapeCssIdentifier('neueé')).toBe('neueé');
});

it('escapes a leading digit as a hex escape', () => {
  expect(escapeCssIdentifier('123abc')).toBe('\\31 23abc');
});

it('escapes unsafe identifier characters', () => {
  expect(escapeCssIdentifier('bg-[red]')).toBe('bg-\\[red\\]');
  expect(escapeCssIdentifier('hover/active')).toBe('hover\\/active');
  expect(escapeCssIdentifier('a:b')).toBe('a\\:b');
});
