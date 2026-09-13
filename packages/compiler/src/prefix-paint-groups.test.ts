import { expect, it } from 'vitest';

import { PREFIX_PAINT_GROUPS } from './prefix-paint-groups';

it('keeps ordered paint and visual-effect prefix groups together', () => {
  expect(PREFIX_PAINT_GROUPS).toHaveLength(55);
  expect(PREFIX_PAINT_GROUPS[0]).toEqual(['bg-linear-to-', 'background-image']);
  expect(PREFIX_PAINT_GROUPS).toContainEqual(['border-be-', 'border-block-end']);
  expect(PREFIX_PAINT_GROUPS.at(-1)).toEqual(['backdrop-', 'backdrop-filter']);
});
