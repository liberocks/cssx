import { describe, expect, it } from 'vitest';

import { compilePrefixedGridUtility } from './compile-prefixed-grid-utility';

describe('compilePrefixedGridUtility', () => {
  it('compiles grid templates, subgrids, spans, and explicit lines', () => {
    expect(compilePrefixedGridUtility('grid-cols-3', false)).toEqual({
      property: 'grid-template-columns',
      value: 'repeat(3, minmax(0, 1fr))',
    });
    expect(compilePrefixedGridUtility('grid-rows-[18rem_1fr]', false)).toEqual({
      property: 'grid-template-rows',
      value: '18rem 1fr',
    });
    expect(compilePrefixedGridUtility('grid-cols-subgrid', false)).toEqual({
      property: 'grid-template-columns',
      value: 'subgrid',
    });
    expect(compilePrefixedGridUtility('grid-rows-subgrid', false)).toEqual({
      property: 'grid-template-rows',
      value: 'subgrid',
    });
    expect(compilePrefixedGridUtility('col-span-full', false)).toEqual({ property: 'grid-column', value: '1 / -1' });
    expect(compilePrefixedGridUtility('row-span-2', false)).toEqual({
      property: 'grid-row',
      value: 'span 2 / span 2',
    });
    expect(compilePrefixedGridUtility('col-start-auto', false)).toEqual({
      property: 'grid-column-start',
      value: 'auto',
    });
    expect(compilePrefixedGridUtility('row-end-3', false)).toEqual({ property: 'grid-row-end', value: '3' });
  });

  it('compiles positive, named, and negative order values and rejects other families', () => {
    expect(compilePrefixedGridUtility('order-first', false)).toEqual({ property: 'order', value: '-9999' });
    expect(compilePrefixedGridUtility('order-last', true)).toEqual({ property: 'order', value: '-9999' });
    expect(compilePrefixedGridUtility('order-none', true)).toEqual({ property: 'order', value: '0' });
    expect(compilePrefixedGridUtility('order-2', true)).toEqual({ property: 'order', value: '-2' });
    expect(compilePrefixedGridUtility('order-2', false)).toEqual({ property: 'order', value: '2' });
    expect(compilePrefixedGridUtility('grid-cols-invalid', false)).toBeNull();
    expect(compilePrefixedGridUtility('flex-1', false)).toBeNull();
  });
});
