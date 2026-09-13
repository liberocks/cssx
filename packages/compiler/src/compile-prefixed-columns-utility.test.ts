import { expect, it } from 'vitest';

import { compilePrefixedColumnsUtility } from './compile-prefixed-columns-utility';

it('compiles named, numeric, arbitrary, and custom-property column counts', () => {
  expect(compilePrefixedColumnsUtility('columns-auto')).toEqual({ property: 'columns', value: 'auto' });
  expect(compilePrefixedColumnsUtility('columns-3')).toEqual({ property: 'columns', value: '3' });
  expect(compilePrefixedColumnsUtility('columns-[18rem]')).toEqual({ property: 'columns', value: '18rem' });
  expect(compilePrefixedColumnsUtility('columns-(--column-count)')).toEqual({
    property: 'columns',
    value: 'var(--column-count)',
  });
});

it('rejects values outside the columns family grammar', () => {
  expect(compilePrefixedColumnsUtility('columns-invalid')).toBeNull();
});
