import { expect, it } from 'vitest';

import { compileArbitraryContainUtility } from './compile-arbitrary-contain-utility';

it('normalizes arbitrary containment values', () => {
  expect(compileArbitraryContainUtility('contain-[layout_paint]')).toEqual({
    property: 'contain',
    value: 'layout paint',
  });
  expect(compileArbitraryContainUtility('contain-layout')).toBeNull();
  expect(compileArbitraryContainUtility('contain-[]')).toBeNull();
});
