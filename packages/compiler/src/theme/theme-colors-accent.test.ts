import { expect, it } from 'vitest';

import { ACCENT_COLOR_TOKENS } from './theme-colors-accent';

it('contains the full shade scale for every accent palette', () => {
  const families = ['steel', 'brown', 'vermilion', 'mint', 'azure', 'amethyst'];
  const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

  expect(Object.keys(ACCENT_COLOR_TOKENS)).toHaveLength(families.length * shades.length);
  for (const family of families) {
    for (const shade of shades) {
      expect(ACCENT_COLOR_TOKENS[`--color-${family}-${shade}`]).toMatch(/^oklch\(.+\)$/);
    }
  }
});
