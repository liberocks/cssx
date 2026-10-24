import { expect, it } from 'vitest';

import type { CompiledUtility } from './compiled-utility';
import { reducePackedUtilities } from './reduce-packed-utilities';

it('keeps winning records in source order and isolates conflict scopes', () => {
  const records: CompiledUtility[] = [
    ['old', 'base', 'layout', 'layout'],
    [null, 'base', 'layout', 'layout'],
    ['new', 'base', 'layout', 'layout'],
    ['hover', 'hover', 'layout', 'layout'],
    ['color', 'base', 'color', 'color'],
  ];

  expect(reducePackedUtilities(records).map(([className]) => className)).toEqual(['new', 'hover', 'color']);
});

it('skips empty class records and sparse record slots', () => {
  const records = [
    ['visible', 'base', 'layout', 'layout'],
    ['', 'base', 'hidden', 'hidden'],
    undefined,
  ] as unknown as readonly CompiledUtility[];

  expect(reducePackedUtilities(records)).toEqual([records[0]]);
});
