import { expect, it } from 'vitest';

import type { ClassNameAllocator } from './class-name';
import { planPartialReusability } from './plan-partial-reusability';

/** Creates deterministic names for direct partial-planning tests. */
function countingAllocator(): ClassNameAllocator {
  let next = 0;
  return {
    allocate: (identities) => new Map(identities.map((identity) => [identity, `c${next++}`])),
    reserve: () => undefined,
  };
}

it('reuses selected fragments and creates aliases for residual atoms', () => {
  const compositions = [['a', 'b'], ['a', 'b'], ['a', 'b'], ['c']];
  const identities = compositions.map((atomicClasses) => atomicClasses.join('\u0000'));

  const plan = planPartialReusability(compositions, identities, 90, countingAllocator());

  expect(plan.classNames.get('a\u0000b')).toBe('c0');
  expect(plan.classNames.get('c')).toBe('c1');
  expect(plan.fragments.get('a\u0000b')).toEqual([{ className: 'c0', atomicClasses: ['a', 'b'] }]);
  expect(plan.fragments.get('c')).toEqual([{ className: 'c1', atomicClasses: ['c'] }]);
});

it('keeps all atoms in residual aliases when the budget selects no groups', () => {
  const compositions = [['a', 'b'], ['a', 'b'], ['a', 'b'], ['c']];
  const identities = compositions.map((atomicClasses) => atomicClasses.join('\u0000'));

  const plan = planPartialReusability(compositions, identities, 1, countingAllocator());

  expect(plan.classNames.get('a\u0000b')).toBe('c0');
  expect(plan.classNames.get('c')).toBe('c1');
  expect(plan.fragments.get('a\u0000b')).toEqual([{ className: 'c0', atomicClasses: ['a', 'b'] }]);
  expect(plan.fragments.get('c')).toEqual([{ className: 'c1', atomicClasses: ['c'] }]);
});

it('omits duplicate and empty composition identities from the final map', () => {
  const compositions = [['a'], ['a'], []];
  const identities = compositions.map((atomicClasses) => atomicClasses.join('\u0000'));

  const plan = planPartialReusability(compositions, identities, 50, countingAllocator());

  expect([...plan.classNames.keys()]).toEqual(['a']);
  expect(plan.fragments.has('')).toBe(false);
});
