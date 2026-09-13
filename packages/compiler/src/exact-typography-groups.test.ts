import { expect, it } from 'vitest';

import { EXACT_TYPOGRAPHY_GROUPS } from './exact-typography-groups';

it('assigns font, numeric, and text utilities to typography groups', () => {
  expect(Object.keys(EXACT_TYPOGRAPHY_GROUPS)).toHaveLength(31);
  expect(EXACT_TYPOGRAPHY_GROUPS['font-semibold']).toEqual({ group: 'font-weight' });
  expect(EXACT_TYPOGRAPHY_GROUPS['tabular-nums']).toEqual({ group: 'numeric-tabular-nums' });
  expect(EXACT_TYPOGRAPHY_GROUPS['no-underline']).toEqual({ group: 'text-decoration-line' });
});
