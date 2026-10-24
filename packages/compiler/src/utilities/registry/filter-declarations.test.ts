import { describe, expect, it } from 'vitest';

import { filterDeclarations } from './filter-declarations';

describe('filterDeclarations', () => {
  it('emits a filter channel and its sink with conflict metadata', () => {
    expect(filterDeclarations('filter', '--fx-', '', 'var(--fx-blur,)', 'blur', 'blur(4px)')).toEqual([
      {
        property: '--fx-blur',
        value: 'blur(4px)',
        semanticGroup: 'blur',
        semanticConflicts: ['blur', 'filter-none'],
      },
      {
        property: 'filter',
        value: 'var(--fx-blur,)',
        semanticGroup: 'blur',
        semanticConflicts: ['blur', 'filter-none'],
      },
    ]);
  });

  it('adds a prefixed WebKit sink for backdrop channels', () => {
    expect(
      filterDeclarations('backdrop-filter', '--backdrop-', 'backdrop-', 'var(--backdrop-blur,)', 'blur', 'blur(4px)'),
    ).toMatchObject([
      { property: '--backdrop-blur', semanticGroup: 'backdrop-blur' },
      { property: '-webkit-backdrop-filter', value: 'var(--backdrop-blur,)' },
      { property: 'backdrop-filter', value: 'var(--backdrop-blur,)' },
    ]);
  });
});
