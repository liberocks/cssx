import { expect, it } from 'vitest';

import {
  CSSX_BACKDROP_FILTER_SINK,
  CSSX_FILTER_SINK,
  CSSX_NUMERIC_SINK,
  CSSX_SHADOW_SINK,
} from './utility-effect-sinks';

it('combines shadow and ring channels in cascade order', () => {
  expect(CSSX_SHADOW_SINK).toBe(
    'var(--cssx-shadow, 0 0 #0000), var(--cssx-ring-offset-shadow, 0 0 #0000), var(--cssx-ring-shadow, 0 0 #0000)',
  );
});

it('includes every standard filter channel in its shared sink', () => {
  expect(CSSX_FILTER_SINK.split(' ')).toEqual(
    ['blur', 'brightness', 'contrast', 'drop-shadow', 'grayscale', 'hue-rotate', 'invert', 'saturate', 'sepia'].map(
      (channel) => `var(--cssx-filter-${channel},)`,
    ),
  );
});

it('includes every backdrop filter channel in its shared sink', () => {
  expect(CSSX_BACKDROP_FILTER_SINK.split(' ')).toEqual(
    ['blur', 'brightness', 'contrast', 'grayscale', 'hue-rotate', 'invert', 'opacity', 'saturate', 'sepia'].map(
      (channel) => `var(--cssx-backdrop-${channel},)`,
    ),
  );
});

it('includes each independent numeric font-variant channel in its sink', () => {
  expect(CSSX_NUMERIC_SINK.split(' ')).toEqual(
    [
      'ordinal',
      'slashed-zero',
      'lining-nums',
      'oldstyle-nums',
      'proportional-nums',
      'tabular-nums',
      'diagonal-fractions',
      'stacked-fractions',
    ].map((channel) => `var(--cssx-numeric-${channel},)`),
  );
});
