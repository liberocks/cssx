import { expect, it } from 'vitest';

import { isLengthArbitraryValue } from './is-length-arbitrary-value';

it('recognizes supported arbitrary length values', () => {
  expect(isLengthArbitraryValue('size:2rem')).toBe(true);
  expect(isLengthArbitraryValue('calc(100% - 1rem)')).toBe(true);
  expect(isLengthArbitraryValue('red')).toBe(false);
});
