import { expect, it } from 'vitest';

import { usageKey } from './usage-key';

it('serializes a sorted usage list as a delimited string', () => {
  expect(usageKey([1, 3, 5])).toBe('1,3,5');
});

it('returns an empty string for an empty usage list', () => {
  expect(usageKey([])).toBe('');
});
