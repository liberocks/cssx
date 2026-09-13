/** Shared box-shadow value that combines shadow, ring offset, and ring channels. */
export const CSSX_SHADOW_SINK =
  'var(--cssx-shadow, 0 0 #0000), var(--cssx-ring-offset-shadow, 0 0 #0000), var(--cssx-ring-shadow, 0 0 #0000)';

/** Shared filter value that combines all standard filter channels. */
export const CSSX_FILTER_SINK =
  'var(--cssx-filter-blur,) var(--cssx-filter-brightness,) var(--cssx-filter-contrast,) var(--cssx-filter-drop-shadow,) var(--cssx-filter-grayscale,) var(--cssx-filter-hue-rotate,) var(--cssx-filter-invert,) var(--cssx-filter-saturate,) var(--cssx-filter-sepia,)';

/** Shared backdrop-filter value that combines all backdrop filter channels. */
export const CSSX_BACKDROP_FILTER_SINK =
  'var(--cssx-backdrop-blur,) var(--cssx-backdrop-brightness,) var(--cssx-backdrop-contrast,) var(--cssx-backdrop-grayscale,) var(--cssx-backdrop-hue-rotate,) var(--cssx-backdrop-invert,) var(--cssx-backdrop-opacity,) var(--cssx-backdrop-saturate,) var(--cssx-backdrop-sepia,)';

/** Shared font-variant value that combines independent numeric channels. */
export const CSSX_NUMERIC_SINK =
  'var(--cssx-numeric-ordinal,) var(--cssx-numeric-slashed-zero,) var(--cssx-numeric-lining-nums,) var(--cssx-numeric-oldstyle-nums,) var(--cssx-numeric-proportional-nums,) var(--cssx-numeric-tabular-nums,) var(--cssx-numeric-diagonal-fractions,) var(--cssx-numeric-stacked-fractions,)';
