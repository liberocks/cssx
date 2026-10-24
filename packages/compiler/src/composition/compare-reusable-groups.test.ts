import { expect, it } from 'vitest';

import { compareReusableGroups } from './compare-reusable-groups';
import type { ReusableGroup } from './reusability';

const group = (overrides: Partial<ReusableGroup>): ReusableGroup => ({
  atomicClasses: [],
  compositionIndexes: [],
  coverage: 0,
  score: 0,
  ...overrides,
});

it('orders groups by descending score first', () => {
  expect(compareReusableGroups(group({ score: 1 }), group({ score: 5 }))).toBeGreaterThan(0);
  expect(compareReusableGroups(group({ score: 5 }), group({ score: 1 }))).toBeLessThan(0);
});

it('breaks score ties by descending coverage', () => {
  expect(compareReusableGroups(group({ score: 2, coverage: 3 }), group({ score: 2, coverage: 7 }))).toBeGreaterThan(0);
  expect(compareReusableGroups(group({ score: 2, coverage: 7 }), group({ score: 2, coverage: 3 }))).toBeLessThan(0);
});

it('breaks coverage ties by composite identity', () => {
  expect(
    compareReusableGroups(
      group({ atomicClasses: ['a'], score: 1, coverage: 1 }),
      group({ atomicClasses: ['b'], score: 1, coverage: 1 }),
    ),
  ).toBeLessThan(0);
  expect(
    compareReusableGroups(
      group({ atomicClasses: ['b'], score: 1, coverage: 1 }),
      group({ atomicClasses: ['a'], score: 1, coverage: 1 }),
    ),
  ).toBeGreaterThan(0);
});
