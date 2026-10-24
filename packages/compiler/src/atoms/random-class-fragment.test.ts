import { expect, it } from 'vitest';

import { randomClassFragment } from './random-class-fragment';

it('uses the complete identity hash and includes retries for unbounded fragments', () => {
  expect(randomClassFragment('cssx', undefined, 0)).toBe('e4x345qy2yeg');
  expect(randomClassFragment('cssx', undefined, 2)).toBe('e4x345qy2yeg-22qjvf0iqdn7i');
});

it('pads and combines hash lanes to produce fixed-length fragments', () => {
  expect(randomClassFragment('cssx', 5, 0)).toBe('2uz2l');
  expect(randomClassFragment('cssx', 16, 1)).toBe('2zprbsstu79yr2zp');
});
