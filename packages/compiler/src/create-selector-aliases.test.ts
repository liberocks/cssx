import { expect, it } from 'vitest';

import { createSelectorAliases } from './create-selector-aliases';

it('inverts composite-to-atom metadata for selector serialization', () => {
  expect(createSelectorAliases({ compA: ['x', 'y'], compB: ['y', 'z'] })).toEqual({
    x: ['compA'],
    y: ['compA', 'compB'],
    z: ['compB'],
  });
});

it('returns an empty alias table for empty input', () => {
  expect(createSelectorAliases({})).toEqual({});
});
