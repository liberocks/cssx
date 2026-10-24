import { expect, it } from 'vitest';

import { EXACT_PAINT_GROUPS } from './exact-paint-groups';

it('assigns border, outline, shadow, filter, and SVG utilities to paint groups', () => {
  expect(Object.keys(EXACT_PAINT_GROUPS)).toHaveLength(25);
  expect(EXACT_PAINT_GROUPS['border-none']).toEqual({ group: 'border-style' });
  expect(EXACT_PAINT_GROUPS['outline-hidden']).toEqual({ group: 'outline-hidden' });
  expect(EXACT_PAINT_GROUPS.shadow).toEqual({ group: 'box-shadow' });
  expect(EXACT_PAINT_GROUPS['fill-none']).toEqual({ group: 'fill' });
});
