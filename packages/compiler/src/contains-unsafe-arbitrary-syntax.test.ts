import { expect, it } from 'vitest';

import { containsUnsafeArbitrarySyntax } from './contains-unsafe-arbitrary-syntax';

it('rejects arbitrary declaration delimiters outside quoted text', () => {
  expect(containsUnsafeArbitrarySyntax('color:red;display:block')).toBe(true);
  expect(containsUnsafeArbitrarySyntax('"value;kept"')).toBe(false);
  expect(containsUnsafeArbitrarySyntax('escaped\\;semicolon')).toBe(false);
});
