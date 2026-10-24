import { expect, it } from 'vitest';

import { compilePrefixedObjectUtility } from './compile-prefixed-object-utility';

it('compiles arbitrary and custom-property object positions', () => {
  expect(compilePrefixedObjectUtility('object-[25%_75%]')).toEqual({
    property: 'object-position',
    value: '25% 75%',
  });
  expect(compilePrefixedObjectUtility('object-(--object-position)')).toEqual({
    property: 'object-position',
    value: 'var(--object-position)',
  });
});

it('rejects named object-fit utilities handled by another family', () => {
  expect(compilePrefixedObjectUtility('object-cover')).toBeNull();
});
