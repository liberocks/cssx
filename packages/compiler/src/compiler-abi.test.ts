import { expect, it } from 'vitest';

import { COMPILER_ABI } from './compiler-abi';

it('keeps the compiler identity used by generated class hashes stable', () => {
  expect(COMPILER_ABI).toBe('cssx-utility-compiler-v2');
});
