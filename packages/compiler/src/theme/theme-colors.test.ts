import { describe, expect, it } from 'vitest';

import { DEFAULT_DOCUMENTED_COLOR_TOKENS } from './theme-colors';

describe('DEFAULT_DOCUMENTED_COLOR_TOKENS', () => {
  it('contains every documented color family and the full 50–950 scale', () => {
    const families = [
      'red',
      'orange',
      'amber',
      'yellow',
      'lime',
      'green',
      'emerald',
      'teal',
      'cyan',
      'sky',
      'blue',
      'indigo',
      'violet',
      'purple',
      'fuchsia',
      'pink',
      'rose',
      'slate',
      'gray',
      'zinc',
      'neutral',
      'stone',
      'mauve',
      'olive',
      'mist',
      'taupe',
      'steel',
      'brown',
      'vermilion',
      'mint',
      'azure',
      'amethyst',
    ];
    const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

    for (const family of families) {
      for (const shade of shades) {
        expect(DEFAULT_DOCUMENTED_COLOR_TOKENS[`--color-${family}-${shade}`], `${family}-${shade}`).toBeTruthy();
      }
    }
    expect(DEFAULT_DOCUMENTED_COLOR_TOKENS['--color-orange-500']).toBe('oklch(70.49% 0.213 47.604)');
    expect(DEFAULT_DOCUMENTED_COLOR_TOKENS['--color-mauve-950']).toBe('oklch(14.53% 0.008 326)');
    expect(DEFAULT_DOCUMENTED_COLOR_TOKENS['--color-amethyst-950']).toBe('oklch(30.00% 0.178 274.080)');
  });
});
