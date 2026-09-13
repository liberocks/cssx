import { expect, it } from 'vitest';

import { BLUE_COLOR_TOKENS } from './theme-colors-blue';

it('contains the full shade scale for every blue palette', () => {
  const families = ['cyan', 'sky', 'blue', 'indigo'];
  const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

  expect(Object.keys(BLUE_COLOR_TOKENS)).toHaveLength(families.length * shades.length);
  for (const family of families) {
    for (const shade of shades) {
      expect(BLUE_COLOR_TOKENS[`--color-${family}-${shade}`]).toMatch(/^oklch\(.+\)$/);
    }
  }
});
