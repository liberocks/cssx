import { expect, it } from 'vitest';

import { compilePrefixedBreakUtility } from './compile-prefixed-break-utility';

it('compiles before, after, and inside break utilities', () => {
  expect(compilePrefixedBreakUtility('break-before-column')).toEqual({ property: 'break-before', value: 'column' });
  expect(compilePrefixedBreakUtility('break-after-avoid-page')).toEqual({
    property: 'break-after',
    value: 'avoid-page',
  });
  expect(compilePrefixedBreakUtility('break-inside-avoid-column')).toEqual({
    property: 'break-inside',
    value: 'avoid-column',
  });
});

it('rejects unsupported break values', () => {
  expect(compilePrefixedBreakUtility('break-before-invalid')).toBeNull();
});
