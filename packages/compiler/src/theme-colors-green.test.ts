import { expect, it } from 'vitest';

import { GREEN_COLOR_TOKENS } from './theme-colors-green';

it('contains the full shade scale for every green palette', () => {
  const families = ['lime', 'green', 'emerald', 'teal'];
  const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

  expect(Object.keys(GREEN_COLOR_TOKENS)).toHaveLength(families.length * shades.length);
  for (const family of families) {
    for (const shade of shades) {
      expect(GREEN_COLOR_TOKENS[`--color-${family}-${shade}`]).toMatch(/^oklch\(.+\)$/);
    }
  }
});
