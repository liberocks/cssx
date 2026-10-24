import { expect, it } from 'vitest';

import { EXACT_MOTION_GROUPS } from './exact-motion-groups';

it('assigns exact transform and transition utilities to motion groups', () => {
  expect(Object.keys(EXACT_MOTION_GROUPS)).toHaveLength(6);
  expect(EXACT_MOTION_GROUPS['transform-none']).toEqual({ group: 'transform' });
  expect(EXACT_MOTION_GROUPS['transition-discrete']).toEqual({ group: 'transition-behavior' });
});
