import { expect, it } from 'vitest';

import { compileArbitraryMaskUtility } from './compile-arbitrary-mask-utility';

it('resolves arbitrary mask positions and sizes', () => {
  expect(compileArbitraryMaskUtility('mask-position-[center]')).toEqual({
    property: 'mask-position',
    value: 'center',
  });
  expect(compileArbitraryMaskUtility('mask-size-[auto_100%]')).toEqual({ property: 'mask-size', value: 'auto 100%' });
});

it('resolves arbitrary mask images and ignores unrelated utilities', () => {
  expect(compileArbitraryMaskUtility('mask-[url("/mask.svg")]')).toEqual({
    property: 'mask-image',
    value: 'url("/mask.svg")',
  });
  expect(compileArbitraryMaskUtility('mask-x-from-20%')).toBeNull();
  expect(compileArbitraryMaskUtility('mask-position')).toBeNull();
});
