import { expect, it } from 'vitest';

import { indexesAreSubset } from './indexes-are-subset';

it('accepts a child that advances through the parent list', () => {
  expect(indexesAreSubset([2, 4], [1, 2, 3, 4])).toBe(true);
});

it('accepts a child that matches the parent from its current position', () => {
  expect(indexesAreSubset([1, 2], [1, 2, 3])).toBe(true);
});

it('accepts an empty child list', () => {
  expect(indexesAreSubset([], [1, 2, 3])).toBe(true);
});

it('rejects a child index missing from the parent', () => {
  expect(indexesAreSubset([1, 5], [1, 2, 3])).toBe(false);
});

it('rejects a child index that falls before the remaining parent entries', () => {
  expect(indexesAreSubset([0, 1], [1, 2])).toBe(false);
});
