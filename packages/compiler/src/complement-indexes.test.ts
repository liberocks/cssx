import { expect, it } from 'vitest';

import { complementIndexes } from './complement-indexes';

it('returns the indexes missing from the child list', () => {
  expect(complementIndexes([0, 1, 2, 3], [1, 3])).toEqual([0, 2]);
});

it('returns every parent index when the child list is empty', () => {
  expect(complementIndexes([2, 4], [])).toEqual([2, 4]);
});

it('returns nothing when the child list matches the parent list', () => {
  expect(complementIndexes([1, 2], [1, 2])).toEqual([]);
});
