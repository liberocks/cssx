import { expect, it } from 'vitest';

import { compilePrefixedTabUtility } from './compile-prefixed-tab-utility';

it('compiles numeric, arbitrary, and custom-property tab sizes', () => {
  expect(compilePrefixedTabUtility('tab-4')).toEqual({ property: 'tab-size', value: '4' });
  expect(compilePrefixedTabUtility('tab-[8]')).toEqual({ property: 'tab-size', value: '8' });
  expect(compilePrefixedTabUtility('tab-(--tab-width)')).toEqual({ property: 'tab-size', value: 'var(--tab-width)' });
});

it('rejects unsupported tab-size values', () => {
  expect(compilePrefixedTabUtility('tab-auto')).toBeNull();
});
