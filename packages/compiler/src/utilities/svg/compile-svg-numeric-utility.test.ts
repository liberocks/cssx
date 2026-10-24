import { expect, it } from 'vitest';

import { compileSvgNumericUtility } from './compile-svg-numeric-utility';

it('resolves numeric and arbitrary SVG stroke values', () => {
  expect(compileSvgNumericUtility('stroke-dasharray-[4_8]')).toEqual({
    property: 'stroke-dasharray',
    value: '4 8',
  });
  expect(compileSvgNumericUtility('stroke-dashoffset-3')).toEqual({ property: 'stroke-dashoffset', value: '3' });
  expect(compileSvgNumericUtility('stroke-miterlimit-invalid')).toBeNull();
  expect(compileSvgNumericUtility('stroke-2')).toBeNull();
});
