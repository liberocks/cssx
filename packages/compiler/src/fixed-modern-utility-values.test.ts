import { expect, it } from 'vitest';

import { FIXED_MODERN_UTILITY_VALUES } from './fixed-modern-utility-values';

it('keeps fixed declarations grouped by modern CSS utility family', () => {
  const utilities = Object.keys(FIXED_MODERN_UTILITY_VALUES);
  const families = [
    'content-visibility',
    'contain',
    'stroke-cap',
    'stroke-join',
    'fill-rule',
    'clip-rule',
    'vector-effect',
    'paint-order',
    'shape-rendering',
    'writing',
    'text-orientation',
    'text-combine',
    'unicode-bidi',
    'image-render',
    'font-optical',
    'font-kerning',
    'font-synthesis',
  ];

  expect(utilities).toHaveLength(58);
  for (const family of families) {
    expect(
      utilities.some((utility) => utility.startsWith(family)),
      family,
    ).toBe(true);
  }
  for (const [property, value] of Object.values(FIXED_MODERN_UTILITY_VALUES)) {
    expect(property).toBeTruthy();
    expect(value).toBeTruthy();
  }
});

it('preserves representative SVG, containment, writing, and font declarations', () => {
  expect(FIXED_MODERN_UTILITY_VALUES['contain-layout']).toEqual(['contain', 'layout']);
  expect(FIXED_MODERN_UTILITY_VALUES['stroke-cap-round']).toEqual(['stroke-linecap', 'round']);
  expect(FIXED_MODERN_UTILITY_VALUES['writing-vertical-rl']).toEqual(['writing-mode', 'vertical-rl']);
  expect(FIXED_MODERN_UTILITY_VALUES['font-synthesis-small-caps']).toEqual(['font-synthesis', 'small-caps']);
});
