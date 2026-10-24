import { expect, it } from 'vitest';

import { hashClassNameIdentity } from './hash-class-name-identity';

it('returns stable base-36 hashes for empty, ASCII, and UTF-16 identities', () => {
  expect(hashClassNameIdentity('')).toBe('33niihzj4ux45');
  expect(hashClassNameIdentity('cssx')).toBe('e4x345qy2yeg');
  expect(hashClassNameIdentity('😀')).toBe('3huu70miqwp20');
});

it('changes the hash when the identity changes', () => {
  expect(hashClassNameIdentity('cssx')).not.toBe(hashClassNameIdentity('cssx '));
});
