import { expect, it } from 'vitest';

import { compileArbitraryColorUtility } from './compile-arbitrary-color-utility';

it('resolves explicitly typed arbitrary font sizes and background images', () => {
  expect(compileArbitraryColorUtility('text', '[length:12px]')).toEqual({ property: 'font-size', value: '12px' });
  expect(compileArbitraryColorUtility('text', '[size:1.25rem]')).toEqual({
    property: 'font-size',
    value: '1.25rem',
  });
  expect(compileArbitraryColorUtility('bg', '[image:url("/image.svg")]')).toEqual({
    property: 'background-image',
    value: 'url("/image.svg")',
  });
});

it('leaves ordinary colors and mismatched arbitrary types to the color resolver', () => {
  expect(compileArbitraryColorUtility('text', '[color:red]')).toBeNull();
  expect(compileArbitraryColorUtility('bg', '[length:12px]')).toBeNull();
  expect(compileArbitraryColorUtility('border', '[image:url("/image.svg")]')).toBeNull();
  expect(compileArbitraryColorUtility('bg', 'red-500')).toBeNull();
});
