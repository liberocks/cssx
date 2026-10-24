import { expect, it } from 'vitest';

import { decodeFirstMapping } from './decode-first-mapping';

it('decodes the first signed VLQ segment and ignores later segments', () => {
  expect(decodeFirstMapping('AC,D')).toEqual([0, 1]);
  expect(decodeFirstMapping('D')).toEqual([-1]);
  expect(decodeFirstMapping('gB')).toEqual([16]);
  expect(decodeFirstMapping(',A')).toEqual([]);
});
