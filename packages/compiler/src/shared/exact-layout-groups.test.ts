import { expect, it } from 'vitest';

import { EXACT_LAYOUT_GROUPS } from './exact-layout-groups';

it('assigns display, positioning, overflow, and flex utilities to layout groups', () => {
  expect(Object.keys(EXACT_LAYOUT_GROUPS)).toHaveLength(40);
  expect(EXACT_LAYOUT_GROUPS['inline-grid']).toEqual({ group: 'display' });
  expect(EXACT_LAYOUT_GROUPS['sr-only']).toEqual({ group: 'sr-only' });
  expect(EXACT_LAYOUT_GROUPS['overflow-clip']).toEqual({ group: 'overflow' });
  expect(EXACT_LAYOUT_GROUPS['flex-col-reverse']).toEqual({ group: 'flex-direction' });
});
