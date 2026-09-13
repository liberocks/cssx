import { expect, it } from 'vitest';

import type { ClassNameAllocator } from './class-name';
import { planReusability } from './plan-reusability';

const countingAllocator = (): ClassNameAllocator => {
  let next = 0;
  return {
    allocate: (identities) => new Map(identities.map((identity) => [identity, `c${next++}`])),
    reserve: () => undefined,
  };
};

it('emits one complete alias per unique composition at a zero budget', () => {
  const plan = planReusability([['b', 'a'], ['c'], ['b', 'a']], 0, countingAllocator());

  expect(plan.classNames.get('a\u0000b')).toBe('c0');
  expect(plan.classNames.get('c')).toBe('c1');
  expect(plan.fragments.get('a\u0000b')).toEqual([{ className: 'c0', atomicClasses: ['a', 'b'] }]);
});

it('emits atoms directly with no fragments at a one hundred budget', () => {
  const plan = planReusability([['a', 'b'], ['a']], 100, countingAllocator());

  expect([...plan.classNames]).toEqual([
    ['a\u0000b', 'a b'],
    ['a', 'a'],
  ]);
  expect(plan.fragments.size).toBe(0);
});

it('reuses fragment aliases and skips duplicate identities at the auto budget', () => {
  const plan = planReusability(
    [['a', 'b'], ['a', 'b'], ['a', 'b'], ['c'], ['c'], ['c'], []],
    'auto',
    countingAllocator(),
  );

  expect(plan.classNames.get('a\u0000b')).toBe('c0');
  expect(plan.classNames.get('c')).toBe('c1');
  expect(plan.fragments.get('a\u0000b')).toEqual([{ className: 'c0', atomicClasses: ['a', 'b'] }]);
  expect(plan.fragments.get('c')).toEqual([{ className: 'c1', atomicClasses: ['c'] }]);
});

it('leaves atoms outside every selected group as a residual alias', () => {
  const plan = planReusability([['a', 'b'], ['a', 'b'], ['a', 'b'], ['c']], 'auto', countingAllocator());

  expect(plan.classNames.get('a\u0000b')).toBe('c0');
  expect(plan.classNames.get('c')).toBe('c1');
  expect(plan.fragments.get('a\u0000b')).toEqual([{ className: 'c0', atomicClasses: ['a', 'b'] }]);
  expect(plan.fragments.get('c')).toEqual([{ className: 'c1', atomicClasses: ['c'] }]);
});
