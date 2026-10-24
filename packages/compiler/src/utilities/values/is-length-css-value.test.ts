import { expect, it } from 'vitest';

import { isLengthCssValue } from './is-length-css-value';

it('accepts unambiguous CSS length values', () => {
  expect(isLengthCssValue('2rem')).toBe(true);
  expect(isLengthCssValue('length:var(--size)')).toBe(true);
  expect(isLengthCssValue('red')).toBe(false);
});
