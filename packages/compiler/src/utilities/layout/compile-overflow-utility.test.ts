import { expect, it } from 'vitest';

import { compileOverflowUtility } from './compile-overflow-utility';

it('resolves axis overflow and overscroll behavior values', () => {
  expect(compileOverflowUtility('overflow-x-hidden')).toEqual({ property: 'overflow-x', value: 'hidden' });
  expect(compileOverflowUtility('overscroll-contain')).toEqual({ property: 'overscroll-behavior', value: 'contain' });
  expect(compileOverflowUtility('overscroll-y-none')).toEqual({ property: 'overscroll-behavior-y', value: 'none' });
  expect(compileOverflowUtility('overflow-visible')).toEqual({ property: 'overflow', value: 'visible' });
  expect(compileOverflowUtility('overflow-autoish')).toBeNull();
});
