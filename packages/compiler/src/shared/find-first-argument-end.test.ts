import { expect, it } from 'vitest';

import { findFirstArgumentEnd } from './find-first-argument-end';

it('skips commas nested in parentheses, brackets, strings, and escapes', () => {
  const source = 'var(calc(1px,2px)[a,b], fallback)';
  expect(findFirstArgumentEnd(source, 4, source.lastIndexOf(')'))).toBe(source.indexOf(', fallback'));
  expect(findFirstArgumentEnd('var(--token)', 4, 11)).toBe(11);
  expect(findFirstArgumentEnd('var("a,b", fallback)', 4, 19)).toBe(9);
  expect(findFirstArgumentEnd('var(a\\,b)', 4, 8)).toBe(8);
});
