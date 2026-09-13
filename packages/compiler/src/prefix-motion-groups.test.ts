import { expect, it } from 'vitest';

import { PREFIX_MOTION_GROUPS } from './prefix-motion-groups';

it('keeps ordered motion and interaction prefix groups together', () => {
  expect(PREFIX_MOTION_GROUPS).toHaveLength(52);
  expect(PREFIX_MOTION_GROUPS[0]).toEqual(['animation-name-', 'animation-name']);
  expect(PREFIX_MOTION_GROUPS).toContainEqual(['view-transition-class-', 'view-transition-class']);
  expect(PREFIX_MOTION_GROUPS.at(-1)).toEqual(['will-change-', 'will-change']);
});
