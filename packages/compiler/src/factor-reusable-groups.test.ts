import { expect, it } from 'vitest';

import { factorReusableGroups } from './factor-reusable-groups';
import { reusableGroup } from './reusable-groups';

it('factors one parent bundle with two complementary low-value groups', () => {
  const parent = reusableGroup(['a', 'b'], [0, 1, 2, 3]);
  const left = reusableGroup(['c'], [0, 1]);
  const right = reusableGroup(['d'], [2, 3]);

  const result = factorReusableGroups([parent, left, right]);

  expect(result.map((group) => group.atomicClasses)).toEqual([
    ['a', 'b', 'c'],
    ['a', 'b', 'd'],
  ]);
  expect(result.map((group) => group.compositionIndexes)).toEqual([
    [0, 1],
    [2, 3],
  ]);
});

it('keeps a parent whose complementary child is missing', () => {
  const parent = reusableGroup(['a', 'b'], [0, 1, 2, 3]);
  const child = reusableGroup(['c'], [0, 1]);
  const unrelated = reusableGroup(['e'], [5, 6]);

  const result = factorReusableGroups([parent, child, unrelated]);

  expect(result.map((group) => group.atomicClasses)).toEqual([['a', 'b'], ['c'], ['e']]);
});

it('skips parents that are too small or already omitted', () => {
  const parent = reusableGroup(['a', 'b'], [0, 1, 2, 3]);
  const left = reusableGroup(['c'], [0, 1]);
  const right = reusableGroup(['d'], [2, 3]);
  const single = reusableGroup(['x'], [0, 1, 2, 3]);
  const short = reusableGroup(['y', 'z'], [0, 1, 2]);

  const result = factorReusableGroups([parent, parent, left, right, single, short]);

  expect(result.map((group) => group.atomicClasses)).toEqual([['a', 'b', 'c'], ['a', 'b', 'd'], ['y', 'z'], ['x']]);
});

it('skips a parent without any eligible children', () => {
  const parent = reusableGroup(['a', 'b'], [0, 1, 2, 3]);
  const single = reusableGroup(['x'], [4, 5, 6, 7]);

  const result = factorReusableGroups([parent, single]);

  expect(result.map((group) => group.atomicClasses)).toEqual([['a', 'b'], ['x']]);
});
