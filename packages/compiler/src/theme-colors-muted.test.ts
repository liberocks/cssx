import { expect, it } from 'vitest';

import { MUTED_COLOR_TOKENS } from './theme-colors-muted';

it('contains the full shade scale for every muted palette', () => {
  const families = ['mauve', 'olive', 'mist', 'taupe'];
  const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

  expect(Object.keys(MUTED_COLOR_TOKENS)).toHaveLength(families.length * shades.length);
  for (const family of families) {
    for (const shade of shades) {
      expect(MUTED_COLOR_TOKENS[`--color-${family}-${shade}`]).toMatch(/^oklch\(.+\)$/);
    }
  }
});
