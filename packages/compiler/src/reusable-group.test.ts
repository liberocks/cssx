import { expect, it } from 'vitest';

import { reusableGroup } from './reusable-group';

it('creates derived statistics for one exact usage group', () => {
  const group = reusableGroup(['a', 'b', 'c'], [0, 1, 2]);

  expect(group.atomicClasses).toEqual(['a', 'b', 'c']);
  expect(group.compositionIndexes).toEqual([0, 1, 2]);
  expect(group.coverage).toBe(9);
  expect(group.score).toBe(3);
});
