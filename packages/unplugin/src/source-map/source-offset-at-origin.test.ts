import { expect, it } from 'vitest';

import { sourceOffsetAtOrigin } from './source-offset-at-origin';

it('converts source line and column coordinates to a bounded zero-based offset', () => {
  expect(sourceOffsetAtOrigin('alpha\nbeta', { line: 0, column: 2 })).toBe(2);
  expect(sourceOffsetAtOrigin('alpha\nbeta', { line: 1, column: 2 })).toBe(8);
  expect(sourceOffsetAtOrigin('alpha\nbeta', { line: 8, column: 8 })).toBe('alpha\nbeta'.length);
});
