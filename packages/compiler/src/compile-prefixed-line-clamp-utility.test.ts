import { expect, it } from 'vitest';

import { compilePrefixedLineClampUtility } from './compile-prefixed-line-clamp-utility';

it('compiles line-clamp-none into declarations that restore unclamped layout', () => {
  expect(compilePrefixedLineClampUtility('line-clamp-none')).toEqual([
    { property: 'overflow', value: 'visible', semanticGroup: 'line-clamp' },
    { property: 'display', value: 'block', semanticGroup: 'line-clamp' },
    { property: '-webkit-box-orient', value: 'horizontal', semanticGroup: 'line-clamp' },
    { property: '-webkit-line-clamp', value: 'unset', semanticGroup: 'line-clamp' },
  ]);
});

it('compiles numeric clamps and rejects unsupported clamp values', () => {
  expect(compilePrefixedLineClampUtility('line-clamp-3')).toEqual([
    { property: 'overflow', value: 'hidden', semanticGroup: 'line-clamp' },
    { property: 'display', value: '-webkit-box', semanticGroup: 'line-clamp' },
    { property: '-webkit-box-orient', value: 'vertical', semanticGroup: 'line-clamp' },
    { property: '-webkit-line-clamp', value: '3', semanticGroup: 'line-clamp' },
  ]);
  expect(compilePrefixedLineClampUtility('line-clamp-auto')).toBeNull();
});
