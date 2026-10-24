import { expect, it } from 'vitest';

import { serialClassFragment } from './serial-class-fragment';

it('encodes counters with the case-sensitive base-62 alphabet', () => {
  expect(serialClassFragment(0)).toBe('0');
  expect(serialClassFragment(35)).toBe('z');
  expect(serialClassFragment(61)).toBe('Z');
  expect(serialClassFragment(62)).toBe('10');
  expect(serialClassFragment(63)).toBe('11');
});
