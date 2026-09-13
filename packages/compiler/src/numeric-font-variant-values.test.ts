import { expect, it } from 'vitest';

import { NUMERIC_FONT_VARIANT_RESET_GROUPS, NUMERIC_FONT_VARIANT_VALUES } from './numeric-font-variant-values';

it('keeps every numeric font-variant value and reset group', () => {
  expect(NUMERIC_FONT_VARIANT_VALUES).toEqual({
    ordinal: 'ordinal',
    'slashed-zero': 'slashed-zero',
    'lining-nums': 'lining-nums',
    'oldstyle-nums': 'oldstyle-nums',
    'proportional-nums': 'proportional-nums',
    'tabular-nums': 'tabular-nums',
    'diagonal-fractions': 'diagonal-fractions',
    'stacked-fractions': 'stacked-fractions',
  });
  expect(NUMERIC_FONT_VARIANT_RESET_GROUPS).toEqual([
    'numeric-normal',
    'numeric-ordinal',
    'numeric-slashed-zero',
    'numeric-lining-nums',
    'numeric-oldstyle-nums',
    'numeric-proportional-nums',
    'numeric-tabular-nums',
    'numeric-diagonal-fractions',
    'numeric-stacked-fractions',
  ]);
});
