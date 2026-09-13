import { expect, it } from 'vitest';

import { VIOLET_COLOR_TOKENS } from './theme-colors-violet';

it('contains the full shade scale for every violet palette', () => {
  const families = ['violet', 'purple', 'fuchsia', 'pink', 'rose'];
  const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

  expect(Object.keys(VIOLET_COLOR_TOKENS)).toHaveLength(families.length * shades.length);
  for (const family of families) {
    for (const shade of shades) {
      expect(VIOLET_COLOR_TOKENS[`--color-${family}-${shade}`]).toMatch(/^oklch\(.+\)$/);
    }
  }
});
