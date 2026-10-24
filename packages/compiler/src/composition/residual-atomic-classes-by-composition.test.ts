import { expect, it } from 'vitest';

import { residualAtomicClassesByComposition } from './residual-atomic-classes-by-composition';

it('keeps only atoms not already represented by selected reusable fragments', () => {
  expect(
    residualAtomicClassesByComposition([['a', 'b'], ['b', 'c'], []], [new Set(['a']), new Set(['b', 'c']), new Set()]),
  ).toEqual([['b'], [], []]);
});
