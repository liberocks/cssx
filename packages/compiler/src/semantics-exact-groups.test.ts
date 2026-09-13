import { expect, it } from 'vitest';

import { EXACT_GROUPS } from './semantics-exact-groups';

it('assigns exact utilities to their atomic semantic groups', () => {
  expect(EXACT_GROUPS.block).toEqual({ group: 'display' });
  expect(EXACT_GROUPS.border).toEqual({ group: 'border-width' });
  expect(EXACT_GROUPS['border-none']).toEqual({ group: 'border-style' });
  expect(EXACT_GROUPS['transition-normal']).toEqual({ group: 'transition-behavior' });
  expect(EXACT_GROUPS['scrollbar-gutter-both']).toEqual({ group: 'scrollbar-gutter' });
  expect(EXACT_GROUPS['not-an-exact-utility']).toBeUndefined();
});

it('keeps numeric, scroll-snap, and border-collapse utilities in their own channels', () => {
  expect(EXACT_GROUPS['normal-nums']).toEqual({ group: 'numeric-normal' });
  expect(EXACT_GROUPS['tabular-nums']).toEqual({ group: 'numeric-tabular-nums' });
  expect(EXACT_GROUPS['snap-x']).toEqual({ group: 'scroll-snap-type' });
  expect(EXACT_GROUPS['snap-mandatory']).toEqual({ group: 'scroll-snap-strictness' });
  expect(EXACT_GROUPS['border-collapse']).toEqual({ group: 'border-collapse' });
});
