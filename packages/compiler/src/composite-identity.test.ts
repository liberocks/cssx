import { expect, it } from 'vitest';

import { compositeIdentity } from './composite-identity';

it('sorts and deduplicates atomic classes before joining them', () => {
  expect(compositeIdentity(['z', 'a', 'z', 'm'])).toBe('a\u0000m\u0000z');
});

it('returns an empty identity when there are no atomic classes', () => {
  expect(compositeIdentity([])).toBe('');
});
