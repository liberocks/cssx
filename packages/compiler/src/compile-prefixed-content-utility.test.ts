import { expect, it } from 'vitest';

import { compilePrefixedContentUtility } from './compile-prefixed-content-utility';

it('compiles none, arbitrary, and custom-property content values', () => {
  expect(compilePrefixedContentUtility('content-none')).toEqual({ property: 'content', value: 'none' });
  expect(compilePrefixedContentUtility("content-['required']")).toEqual({
    property: 'content',
    value: "'required'",
  });
  expect(compilePrefixedContentUtility('content-(--content-value)')).toEqual({
    property: 'content',
    value: 'var(--content-value)',
  });
});

it('rejects unsupported content values', () => {
  expect(compilePrefixedContentUtility('content-auto')).toBeNull();
});
