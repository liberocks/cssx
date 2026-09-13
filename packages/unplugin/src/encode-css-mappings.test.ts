import { expect, it } from 'vitest';

import { encodeCssMappings } from './encode-css-mappings';

it('encodes relative generated and original positions across lines', () => {
  expect(
    encodeCssMappings([
      { line: 0, column: 0, source: 0, originalLine: 0, originalColumn: 0 },
      { line: 0, column: 8, source: 0, originalLine: 0, originalColumn: 4 },
      { line: 1, column: 2, source: 1, originalLine: 3, originalColumn: 1 },
    ]),
  ).toBe('AAAA,QAAI;ECGH');
  expect(encodeCssMappings([])).toBe('');
  expect(encodeCssMappings([{ line: 2, column: 0, source: 0, originalLine: 0, originalColumn: 0 }])).toBe(';;AAAA');
});
