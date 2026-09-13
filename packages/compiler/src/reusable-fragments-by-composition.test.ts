import { expect, it } from 'vitest';

import { compositeIdentity } from './composite-identity';
import { compositeNameIdentity } from './composite-name-identity';
import type { ReusableGroup } from './reusability';
import { reusableFragmentsByComposition } from './reusable-fragments-by-composition';

it('shares selected fragments with every composition covered by a group', () => {
  const group: ReusableGroup = {
    atomicClasses: ['a', 'b'],
    compositionIndexes: [0, 2],
    coverage: 4,
    score: 2,
  };
  const names = new Map([[compositeNameIdentity(compositeIdentity(group.atomicClasses)), 'shared']]);

  expect(reusableFragmentsByComposition(3, [group], names)).toEqual([
    [{ className: 'shared', atomicClasses: ['a', 'b'] }],
    [],
    [{ className: 'shared', atomicClasses: ['a', 'b'] }],
  ]);
});

it('returns empty fragment lists when no groups were selected', () => {
  expect(reusableFragmentsByComposition(2, [], new Map())).toEqual([[], []]);
});
