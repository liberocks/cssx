import { expect, it } from 'vitest';

import { reusableGroup, reusableGroups } from './reusable-groups';

it('creates derived statistics for one exact usage group', () => {
  const group = reusableGroup(['a', 'b', 'c'], [0, 1, 2]);

  expect(group.atomicClasses).toEqual(['a', 'b', 'c']);
  expect(group.compositionIndexes).toEqual([0, 1, 2]);
  expect(group.coverage).toBe(9);
  expect(group.score).toBe(3);
});

it('returns an empty list for an empty input', () => {
  expect(reusableGroups([])).toEqual([]);
  expect(reusableGroups([[]])).toEqual([]);
});

it('skips atoms that occur only once', () => {
  expect(reusableGroups([['x'], ['y']])).toEqual([]);
});

it('groups atoms that share the same usage set', () => {
  const groups = reusableGroups([
    ['a', 'b'],
    ['a', 'b'],
  ]);

  expect(groups).toHaveLength(1);
  expect(groups[0]!.atomicClasses).toEqual(['a', 'b']);
  expect(groups[0]!.compositionIndexes).toEqual([0, 1]);
});

it('creates independent groups for different usage sets', () => {
  const groups = reusableGroups([
    ['a', 'b'],
    ['a', 'c'],
    ['b', 'c'],
  ]);

  expect(groups).toHaveLength(3);
});
