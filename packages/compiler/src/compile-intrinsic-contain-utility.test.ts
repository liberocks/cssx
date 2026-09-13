import { expect, it } from 'vitest';

import { compileIntrinsicContainUtility } from './compile-intrinsic-contain-utility';
import { parseTheme } from './theme';

it('resolves themed, arbitrary, and custom-property intrinsic sizes', () => {
  const theme = parseTheme();
  expect(compileIntrinsicContainUtility('contain-intrinsic-size-none', theme)).toEqual({
    property: 'contain-intrinsic-size',
    value: 'none',
  });
  expect(compileIntrinsicContainUtility('contain-intrinsic-inline-size-2', theme)).toEqual({
    property: 'contain-intrinsic-inline-size',
    value: 'calc(0.25rem * 2)',
  });
  expect(
    compileIntrinsicContainUtility('contain-intrinsic-size-custom', {
      ...theme,
      tokens: { ...theme.tokens, '--contain-intrinsic-size-custom': '24px' },
    }),
  ).toEqual({ property: 'contain-intrinsic-size', value: '24px' });
  expect(compileIntrinsicContainUtility('contain-intrinsic-size-(--custom)', theme)?.value).toBe('var(--custom)');
  expect(compileIntrinsicContainUtility('contain-intrinsic-size-missing', theme)).toBeNull();
  expect(compileIntrinsicContainUtility('contain-layout', theme)).toBeNull();
});
