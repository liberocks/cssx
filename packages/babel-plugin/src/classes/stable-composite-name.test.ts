import { expect, it } from 'vitest';

import { nextStableCompositeOrdinal, stableCompositeName } from './stable-composite-name';

it('creates stable CSS-safe names that vary with file, location, and semantic kind', () => {
  const name = stableCompositeName('/project/styles.ts', undefined, 'sx');
  expect(name).toMatch(/^d[a-z0-9]+$/);
  expect(stableCompositeName('/project/styles.ts', undefined, 'sx')).toBe(name);
  expect(stableCompositeName('/project/other.ts', undefined, 'sx')).not.toBe(name);
  expect(stableCompositeName('/project/styles.ts', { line: 1, column: 2 }, 'sx')).not.toBe(name);
  expect(stableCompositeName('/project/styles.ts', undefined, 'props')).not.toBe(name);
});

it('allocates zero-based stable call ordinals per source module', () => {
  const state: { stableClassNameOrdinal?: number } = {};

  expect(nextStableCompositeOrdinal(state)).toBe(0);
  expect(nextStableCompositeOrdinal(state)).toBe(1);
  expect(state.stableClassNameOrdinal).toBe(2);
});
