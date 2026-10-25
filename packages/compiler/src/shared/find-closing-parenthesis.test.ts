import { expect, it } from 'vitest';

import { findClosingParenthesis } from './find-closing-parenthesis';

it('finds balanced parentheses while skipping strings and escapes', () => {
  expect(findClosingParenthesis('fn(a(b))', 2)).toBe(7);
  expect(findClosingParenthesis('fn("a)b")', 2)).toBe(8);
  expect(findClosingParenthesis('fn(a\\)b)', 2)).toBe(7);
  expect(findClosingParenthesis('fn(a', 2)).toBe(-1);
});
