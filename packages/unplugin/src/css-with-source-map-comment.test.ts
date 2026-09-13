import { expect, it } from 'vitest';

import { cssWithSourceMapComment } from './css-with-source-map-comment';

it('adds a basename source-map comment only when a map is present', () => {
  expect(
    cssWithSourceMapComment({ css: '.x{}', map: { version: 3, sources: [], names: [], mappings: '' } }, 'assets/x.css'),
  ).toBe('.x{}\n/*# sourceMappingURL=x.css.map */');
  expect(cssWithSourceMapComment({ css: '.x{}' }, 'assets/x.css')).toBe('.x{}');
});
