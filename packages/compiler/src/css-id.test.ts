import { expect, it } from 'vitest';

import { cssId } from './css-id';

it('produces a stable compact identifier for one CSS payload', () => {
  expect(cssId('.foo{color:red}')).toBe('cssx-1cj4wn5');
});

it('returns the same identifier for the same input and differs for different inputs', () => {
  const payload = 'a';
  expect(cssId(payload)).toBe(cssId(payload));
  expect(cssId('a')).not.toBe(cssId('b'));
});

it('hashes an empty payload deterministically', () => {
  expect(cssId('')).toBe('cssx-ztntfp');
});
