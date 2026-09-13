import { expect, it } from 'vitest';

import { EXACT_INTERACTION_GROUPS } from './exact-interaction-groups';

it('assigns scrolling, scrollbar, snap, and form-control utilities to interaction groups', () => {
  expect(Object.keys(EXACT_INTERACTION_GROUPS)).toHaveLength(43);
  expect(EXACT_INTERACTION_GROUPS['snap-mandatory']).toEqual({ group: 'scroll-snap-strictness' });
  expect(EXACT_INTERACTION_GROUPS['scrollbar-gutter-both']).toEqual({ group: 'scrollbar-gutter' });
  expect(EXACT_INTERACTION_GROUPS['appearance-none']).toEqual({ group: 'appearance' });
});
