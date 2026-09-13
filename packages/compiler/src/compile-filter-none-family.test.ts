import { expect, it } from 'vitest';

import { compileFilterNoneFamily } from './compile-filter-none-family';

it('creates filter and backdrop-filter resets for their complete semantic families', () => {
  expect(compileFilterNoneFamily('filter-none', 'filter', '')).toEqual([
    expect.objectContaining({
      property: 'filter',
      value: 'none',
      semanticGroup: 'filter-none',
      semanticConflicts: expect.arrayContaining(['blur', 'filter-none', 'opacity']),
    }),
  ]);
  expect(compileFilterNoneFamily('filter-none', 'backdrop-filter', 'backdrop-')).toHaveLength(2);
  expect(compileFilterNoneFamily('blur-sm', 'filter', '')).toBeNull();
});
