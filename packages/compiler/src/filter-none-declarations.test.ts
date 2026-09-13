import { describe, expect, it } from 'vitest';

import { filterNoneDeclarations } from './filter-none-declarations';

describe('filterNoneDeclarations', () => {
  it('resets the filter property and adds the WebKit backdrop reset when needed', () => {
    expect(filterNoneDeclarations('filter', 'filter-none', ['blur', 'filter-none'])).toEqual([
      { property: 'filter', value: 'none', semanticGroup: 'filter-none', semanticConflicts: ['blur', 'filter-none'] },
    ]);
    expect(filterNoneDeclarations('backdrop-filter', 'backdrop-filter-none', ['backdrop-blur'])).toEqual([
      {
        property: '-webkit-backdrop-filter',
        value: 'none',
        semanticGroup: 'backdrop-filter-none',
        semanticConflicts: ['backdrop-blur'],
      },
      {
        property: 'backdrop-filter',
        value: 'none',
        semanticGroup: 'backdrop-filter-none',
        semanticConflicts: ['backdrop-blur'],
      },
    ]);
  });
});
