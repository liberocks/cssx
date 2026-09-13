import { describe, expect, it } from 'vitest';

import { ACCENT_COLOR_TOKENS } from './theme-colors-accent';
import { BLUE_COLOR_TOKENS } from './theme-colors-blue';
import { GREEN_COLOR_TOKENS } from './theme-colors-green';
import { MUTED_COLOR_TOKENS } from './theme-colors-muted';
import { NEUTRAL_COLOR_TOKENS } from './theme-colors-neutral';
import { VIOLET_COLOR_TOKENS } from './theme-colors-violet';
import { WARM_COLOR_TOKENS } from './theme-colors-warm';

const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const groups = [
  { name: 'warm', families: ['red', 'orange', 'amber', 'yellow'], tokens: WARM_COLOR_TOKENS },
  { name: 'green', families: ['lime', 'green', 'emerald', 'teal'], tokens: GREEN_COLOR_TOKENS },
  { name: 'blue', families: ['cyan', 'sky', 'blue', 'indigo'], tokens: BLUE_COLOR_TOKENS },
  { name: 'violet', families: ['violet', 'purple', 'fuchsia', 'pink', 'rose'], tokens: VIOLET_COLOR_TOKENS },
  { name: 'neutral', families: ['slate', 'gray', 'zinc', 'neutral', 'stone'], tokens: NEUTRAL_COLOR_TOKENS },
  { name: 'muted', families: ['mauve', 'olive', 'mist', 'taupe'], tokens: MUTED_COLOR_TOKENS },
  {
    name: 'accent',
    families: ['steel', 'brown', 'vermilion', 'mint', 'azure', 'amethyst'],
    tokens: ACCENT_COLOR_TOKENS,
  },
];

describe('documented theme color groups', () => {
  for (const { name, families, tokens } of groups) {
    it(`contains the complete shade scale for each ${name} family`, () => {
      for (const family of families) {
        for (const shade of shades) {
          expect(tokens[`--color-${family}-${shade}`], `${family}-${shade}`).toBeTruthy();
        }
      }
      expect(Object.keys(tokens)).toHaveLength(families.length * shades.length);
    });
  }
});
