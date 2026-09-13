import { expect, it } from 'vitest';

import { isWhitespaceCode } from './is-whitespace-code';

it('recognizes supported utility-list whitespace', () => {
  expect(isWhitespaceCode(0x20)).toBe(true);
  expect(isWhitespaceCode(0x2003)).toBe(true);
  expect(isWhitespaceCode(0x61)).toBe(false);
});
