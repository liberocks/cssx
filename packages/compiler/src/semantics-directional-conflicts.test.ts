import { expect, it } from 'vitest';

import { DIRECTIONAL_CONFLICTS } from './semantics-directional-conflicts';

it('preserves physical and logical margin and padding reset relationships', () => {
  expect(DIRECTIONAL_CONFLICTS.p).toEqual(['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe']);
  expect(DIRECTIONAL_CONFLICTS.px).toEqual(['px', 'pl', 'pr', 'ps', 'pe']);
  expect(DIRECTIONAL_CONFLICTS.m).toContain('me');
  expect(DIRECTIONAL_CONFLICTS.my).toEqual(['my', 'mt', 'mb']);
});

it('preserves box, inset, grid-gap, and border shorthand conflict relationships', () => {
  expect(DIRECTIONAL_CONFLICTS.size).toEqual(['size', 'width', 'height']);
  expect(DIRECTIONAL_CONFLICTS.inset).toContain('start');
  expect(DIRECTIONAL_CONFLICTS.gap).toEqual(['gap', 'row-gap', 'column-gap']);
  expect(DIRECTIONAL_CONFLICTS.border).toContain('border-inline-end');
  expect(DIRECTIONAL_CONFLICTS['border-width']).toContain('border-top');
});
