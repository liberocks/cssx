import { expect, it } from 'vitest';

import { compositeNameIdentity } from './composite-name-identity';
import { createCompleteCompositionPlan } from './create-complete-composition-plan';

it('maps every unique composition to one complete alias fragment', () => {
  const names = new Map([
    [compositeNameIdentity('a\u0000b'), 'alias1'],
    [compositeNameIdentity('c'), 'alias2'],
  ]);

  const plan = createCompleteCompositionPlan(
    ['a\u0000b', 'c', '', 'a\u0000b'],
    [['a', 'b'], ['c'], ['unused'], ['a', 'b']],
    names,
  );

  expect([...plan.classNames]).toEqual([
    ['a\u0000b', 'alias1'],
    ['c', 'alias2'],
  ]);
  expect(plan.fragments.get('a\u0000b')).toEqual([{ className: 'alias1', atomicClasses: ['a', 'b'] }]);
  expect(plan.fragments.get('c')).toEqual([{ className: 'alias2', atomicClasses: ['c'] }]);
});

it('returns empty maps for an empty input', () => {
  const plan = createCompleteCompositionPlan([], [], new Map());

  expect(plan.classNames.size).toBe(0);
  expect(plan.fragments.size).toBe(0);
});
