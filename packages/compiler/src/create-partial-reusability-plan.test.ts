import { expect, it } from 'vitest';

import { compositeIdentity } from './composite-identity';
import { compositeNameIdentity } from './composite-name-identity';
import { createPartialReusabilityPlan } from './create-partial-reusability-plan';
import type { ReusableFragment } from './reusability';

it('combines reusable and residual class names for each unique non-empty identity', () => {
  const reusable: ReusableFragment = { className: 'shared', atomicClasses: ['a'] };
  const residualNames = new Map([
    [compositeNameIdentity(compositeIdentity(['b'])), 'residual-b'],
    [compositeNameIdentity(compositeIdentity(['c'])), 'residual-c'],
  ]);

  const plan = createPartialReusabilityPlan(
    ['ab', 'ab', 'c', ''],
    [[reusable], [reusable], [], []],
    [['b'], ['b'], ['c'], []],
    residualNames,
  );

  expect([...plan.classNames]).toEqual([
    ['ab', 'shared residual-b'],
    ['c', 'residual-c'],
  ]);
  expect([...plan.fragments]).toEqual([
    ['ab', [reusable, { className: 'residual-b', atomicClasses: ['b'] }]],
    ['c', [{ className: 'residual-c', atomicClasses: ['c'] }]],
  ]);
});

it('keeps a reusable-only composition without adding an empty residual class', () => {
  const reusable: ReusableFragment = { className: 'shared', atomicClasses: ['a'] };

  expect(createPartialReusabilityPlan(['a'], [[reusable]], [[]], new Map())).toEqual({
    classNames: new Map([['a', 'shared']]),
    fragments: new Map([['a', [reusable]]]),
  });
});

it('omits empty fragment names from the class string while preserving fragment metadata', () => {
  const reusable: ReusableFragment = { className: '', atomicClasses: ['a'] };

  expect(createPartialReusabilityPlan(['a'], [[reusable]], [[]], new Map())).toEqual({
    classNames: new Map([['a', '']]),
    fragments: new Map([['a', [reusable]]]),
  });
});
