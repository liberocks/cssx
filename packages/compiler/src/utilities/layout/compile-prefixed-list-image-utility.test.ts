import { expect, it } from 'vitest';

import { compilePrefixedListImageUtility } from './compile-prefixed-list-image-utility';

it('compiles arbitrary and custom-property list images', () => {
  expect(compilePrefixedListImageUtility('list-image-[url("/marker.svg")]')).toEqual({
    property: 'list-style-image',
    value: 'url("/marker.svg")',
  });
  expect(compilePrefixedListImageUtility('list-image-(--marker-image)')).toEqual({
    property: 'list-style-image',
    value: 'var(--marker-image)',
  });
});

it('rejects named list-image values outside the supported grammar', () => {
  expect(compilePrefixedListImageUtility('list-image-none')).toBeNull();
});
