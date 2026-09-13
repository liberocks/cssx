/** Utility suffixes and CSS values for composable numeric font variants. */
export const NUMERIC_FONT_VARIANT_VALUES: Readonly<Record<string, string>> = {
  ordinal: 'ordinal',
  'slashed-zero': 'slashed-zero',
  'lining-nums': 'lining-nums',
  'oldstyle-nums': 'oldstyle-nums',
  'proportional-nums': 'proportional-nums',
  'tabular-nums': 'tabular-nums',
  'diagonal-fractions': 'diagonal-fractions',
  'stacked-fractions': 'stacked-fractions',
};

/** Semantic groups reset by `normal-nums` before applying a numeric variant. */
export const NUMERIC_FONT_VARIANT_RESET_GROUPS: readonly string[] = [
  'numeric-normal',
  ...Object.keys(NUMERIC_FONT_VARIANT_VALUES).map((value) => `numeric-${value}`),
];
