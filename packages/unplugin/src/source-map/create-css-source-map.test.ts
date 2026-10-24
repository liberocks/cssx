import { expect, it } from 'vitest';

import { createCssSourceMap } from './create-css-source-map';

it('sorts source names and maps only utility entries with known origins', () => {
  expect(createCssSourceMap('', [{ candidate: 'missing', css: '.missing{}' }], new Map())).toBeUndefined();

  const map = createCssSourceMap(
    '.reset{}\n',
    [
      { candidate: 'first', css: '.first{}' },
      { candidate: 'missing', css: '.missing{}' },
      { candidate: 'second', css: '.second{}' },
    ],
    new Map([
      ['first', { id: '/z.ts', line: 2, column: 4 }],
      ['second', { id: '/a.ts', line: 5, column: 1 }],
    ]),
  );

  expect(map).toMatchObject({ version: 3, sources: ['/a.ts', '/z.ts'], names: [] });
  expect(map?.mappings).not.toBe('');
});
