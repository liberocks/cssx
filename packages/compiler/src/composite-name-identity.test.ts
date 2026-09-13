import { expect, it } from 'vitest';

import { compositeNameIdentity } from './composite-name-identity';

it('adds the compiler and composite namespaces to an identity', () => {
  expect(compositeNameIdentity('atomic-a\u0000atomic-b')).toBe(
    'cssx-utility-compiler-v2\u0000composite\u0000atomic-a\u0000atomic-b',
  );
});
