import { expect, it } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { escapeRegex } from './escape-regex.js';

it('escapes regular-expression metacharacters in configured function names', () => {
  expect(escapeRegex('ui.sx+([x])')).toBe('ui\\.sx\\+\\(\\[x\\]\\)');
});

it('stringifies non-string values before escaping them', () => {
  expect(escapeRegex(12)).toBe('12');
});
