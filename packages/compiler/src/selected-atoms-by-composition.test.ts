import { expect, it } from 'vitest';

import type { ReusableGroup } from './reusability';
import { selectedAtomsByComposition } from './selected-atoms-by-composition';

it('collects every selected group atom at each covered composition index', () => {
  const groups: ReusableGroup[] = [
    { atomicClasses: ['a', 'b'], compositionIndexes: [0, 1], coverage: 4, score: 2 },
    { atomicClasses: ['c'], compositionIndexes: [1], coverage: 1, score: 0 },
  ];

  expect(selectedAtomsByComposition([['a', 'b'], ['a', 'b', 'c'], []], groups)).toEqual([
    new Set(['a', 'b']),
    new Set(['a', 'b', 'c']),
    new Set(),
  ]);
});

it('creates an empty selection set for each composition when no groups are selected', () => {
  expect(selectedAtomsByComposition([['a'], ['b']], [])).toEqual([new Set(), new Set()]);
});
