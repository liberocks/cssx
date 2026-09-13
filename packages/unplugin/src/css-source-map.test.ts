import { expect, it } from 'vitest';

import { cssSourceMap } from './css-source-map';

it('serializes a source map with its emitted file name', () => {
  expect(cssSourceMap({ version: 3, sources: ['app.ts'], names: [], mappings: 'AAAA' }, 'app.css')).toBe(
    '{"version":3,"sources":["app.ts"],"names":[],"mappings":"AAAA","file":"app.css"}',
  );
});
