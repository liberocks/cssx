import { expect, it } from 'vitest';

import { NEUTRAL_COLOR_TOKENS } from './theme-colors-neutral';

it('contains the full shade scale for every neutral palette', () => {
  const families = ['slate', 'gray', 'zinc', 'neutral', 'stone'];
  const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

  expect(Object.keys(NEUTRAL_COLOR_TOKENS)).toHaveLength(families.length * shades.length);
  for (const family of families) {
    for (const shade of shades) {
      expect(NEUTRAL_COLOR_TOKENS[`--color-${family}-${shade}`]).toMatch(/^oklch\(.+\)$/);
    }
  }
});
