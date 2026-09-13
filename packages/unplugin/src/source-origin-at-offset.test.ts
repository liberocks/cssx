import { expect, it } from 'vitest';

import { sourceOriginAtOffset } from './source-origin-at-offset';

it('converts bounded source offsets to zero-based line and column coordinates', () => {
  expect(sourceOriginAtOffset('alpha\nbeta', 0)).toEqual({ line: 0, column: 0 });
  expect(sourceOriginAtOffset('alpha\nbeta', 6)).toEqual({ line: 1, column: 0 });
  expect(sourceOriginAtOffset('alpha\nbeta', 99)).toEqual({ line: 1, column: 4 });
});
