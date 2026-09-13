import { expect, it } from 'vitest';

import { EXACT_SCROLL_DECLARATIONS } from './utility-exact-scroll';

it('resolves fixed scrolling, table, and scroll-snap declarations', () => {
  expect(Object.keys(EXACT_SCROLL_DECLARATIONS)).toHaveLength(26);
  expect(EXACT_SCROLL_DECLARATIONS['scrollbar-gutter-both']).toEqual([
    { property: 'scrollbar-gutter', value: 'stable both-edges' },
  ]);
  expect(EXACT_SCROLL_DECLARATIONS['snap-y']).toEqual([
    { property: 'scroll-snap-type', value: 'y var(--cssx-scroll-snap-strictness, proximity)' },
  ]);
  expect(EXACT_SCROLL_DECLARATIONS['table-fixed']).toEqual([{ property: 'table-layout', value: 'fixed' }]);
});
