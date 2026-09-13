import { expect, it } from 'vitest';

import { isNativeStyleArray } from './is-native-style-array';

it('recognizes nested arrays and rejects scalar or compiled style inputs', () => {
  expect(isNativeStyleArray([])).toBe(true);
  expect(isNativeStyleArray(false)).toBe(false);
  expect(isNativeStyleArray({ $$cssx: 3, style: {} })).toBe(false);
});
