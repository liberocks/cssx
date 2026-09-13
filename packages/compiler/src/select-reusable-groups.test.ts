import { expect, it } from 'vitest';

import type { ReusableGroup } from './reusability';
import { selectReusableGroups } from './select-reusable-groups';

const group = (overrides: Partial<ReusableGroup>): ReusableGroup => ({
  atomicClasses: ['a'],
  compositionIndexes: [0],
  coverage: 1,
  score: 0,
  ...overrides,
});

it('keeps positive-value groups and reusable singleton atoms at the auto budget', () => {
  const boxes = [
    group({ atomicClasses: ['a', 'b'], coverage: 4, score: 2 }),
    group({ atomicClasses: ['a'], compositionIndexes: [0, 1, 2], coverage: 3, score: 0 }),
    group({ atomicClasses: ['c'], compositionIndexes: [0, 1], coverage: 2, score: 0 }),
    group({ atomicClasses: ['d'], coverage: 2, score: -1 }),
  ];

  expect(selectReusableGroups(boxes, 11, 'auto')).toEqual([boxes[0], boxes[1]]);
});

it('excludes positive-value groups when their combined coverage exceeds the budget', () => {
  const boxes = [
    group({ atomicClasses: ['a', 'b'], coverage: 4, score: 2 }),
    group({ atomicClasses: ['c', 'd'], coverage: 4, score: 2 }),
  ];

  const selected = selectReusableGroups(boxes, 10, 40);

  expect(selected).toHaveLength(1);
});

it('selects every eligible group when the budget covers all coverage', () => {
  const boxes = [
    group({ atomicClasses: ['a', 'b'], coverage: 4, score: 2 }),
    group({ atomicClasses: ['a'], compositionIndexes: [0, 1, 2], coverage: 3, score: 0 }),
  ];

  expect(selectReusableGroups(boxes, 7, 100)).toEqual(boxes);
});
