import { expect, it } from 'vitest';

import { WARM_COLOR_TOKENS } from './theme-colors-warm';

it('contains the full shade scale for every warm palette', () => {
  const families = ['red', 'orange', 'amber', 'yellow'];
  const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

  expect(Object.keys(WARM_COLOR_TOKENS)).toHaveLength(families.length * shades.length);
  for (const family of families) {
    for (const shade of shades) {
      expect(WARM_COLOR_TOKENS[`--color-${family}-${shade}`]).toMatch(/^oklch\(.+\)$/);
    }
  }
});
