import { expect, it } from 'vitest';

import { PREFIX_LAYOUT_GROUPS } from './prefix-layout-groups';

it('keeps ordered layout and sizing prefix groups together', () => {
  expect(PREFIX_LAYOUT_GROUPS).toHaveLength(82);
  expect(PREFIX_LAYOUT_GROUPS[0]).toEqual(['content-visibility-', 'content-visibility']);
  expect(PREFIX_LAYOUT_GROUPS).toContainEqual(['inset-bs-', 'inset-block-start']);
  expect(PREFIX_LAYOUT_GROUPS.at(-1)).toEqual(['space-y-', 'space-y']);
});
