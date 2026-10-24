import { describe, expect, it } from 'vitest';

import { compilePrefixedLayoutUtility } from './compile-prefixed-layout-utility';

describe('compilePrefixedLayoutUtility', () => {
  it('compiles columns, content, breaks, object position, tab size, and list image', () => {
    expect(compilePrefixedLayoutUtility('columns-3')).toEqual({ property: 'columns', value: '3' });
    expect(compilePrefixedLayoutUtility('columns-[18rem]')).toEqual({ property: 'columns', value: '18rem' });
    expect(compilePrefixedLayoutUtility('content-none')).toEqual({ property: 'content', value: 'none' });
    expect(compilePrefixedLayoutUtility("content-['required']")).toMatchObject({ property: 'content' });
    expect(compilePrefixedLayoutUtility('break-before-column')).toEqual({ property: 'break-before', value: 'column' });
    expect(compilePrefixedLayoutUtility('break-inside-avoid-page')).toEqual({
      property: 'break-inside',
      value: 'avoid-page',
    });
    expect(compilePrefixedLayoutUtility('object-[25%_75%]')).toEqual({
      property: 'object-position',
      value: '25% 75%',
    });
    expect(compilePrefixedLayoutUtility('tab-[8]')).toEqual({ property: 'tab-size', value: '8' });
    expect(compilePrefixedLayoutUtility('list-image-[url("/marker.svg")]')).toMatchObject({
      property: 'list-style-image',
    });
  });

  it('compiles both line-clamp states and rejects unsupported candidates', () => {
    expect(compilePrefixedLayoutUtility('line-clamp-none')).toEqual([
      { property: 'overflow', value: 'visible', semanticGroup: 'line-clamp' },
      { property: 'display', value: 'block', semanticGroup: 'line-clamp' },
      { property: '-webkit-box-orient', value: 'horizontal', semanticGroup: 'line-clamp' },
      { property: '-webkit-line-clamp', value: 'unset', semanticGroup: 'line-clamp' },
    ]);
    expect(compilePrefixedLayoutUtility('line-clamp-3')).toEqual([
      { property: 'overflow', value: 'hidden', semanticGroup: 'line-clamp' },
      { property: 'display', value: '-webkit-box', semanticGroup: 'line-clamp' },
      { property: '-webkit-box-orient', value: 'vertical', semanticGroup: 'line-clamp' },
      { property: '-webkit-line-clamp', value: '3', semanticGroup: 'line-clamp' },
    ]);
    expect(compilePrefixedLayoutUtility('columns-invalid')).toBeNull();
    expect(compilePrefixedLayoutUtility('line-clamp-auto')).toBeNull();
    expect(compilePrefixedLayoutUtility('grid-cols-3')).toBeNull();
  });
});
