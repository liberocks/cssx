import { expect, it } from 'vitest';

import { compileSvgStrokeWidthUtility } from './compile-svg-stroke-width-utility';

it('resolves numeric and arbitrary SVG stroke widths', () => {
  expect(compileSvgStrokeWidthUtility('stroke-2')).toEqual({ property: 'stroke-width', value: '2' });
  expect(compileSvgStrokeWidthUtility('stroke-[1.5px]')).toEqual({ property: 'stroke-width', value: '1.5px' });
  expect(compileSvgStrokeWidthUtility('stroke-current')).toBeNull();
});
