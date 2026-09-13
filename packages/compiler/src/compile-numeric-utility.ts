import type { UtilityDeclaration } from './utility-types';

/** Combined numeric font-variant value fed by independent utility channels. */
const CSSX_NUMERIC_SINK =
  'var(--cssx-numeric-ordinal,) var(--cssx-numeric-slashed-zero,) var(--cssx-numeric-lining-nums,) var(--cssx-numeric-oldstyle-nums,) var(--cssx-numeric-proportional-nums,) var(--cssx-numeric-tabular-nums,) var(--cssx-numeric-diagonal-fractions,) var(--cssx-numeric-stacked-fractions,)';

/**
 * Compiles composable numeric font-variant utilities.
 *
 * @param utility Utility name without variants.
 * @returns Numeric declarations, or null when unsupported.
 */
export function compileNumericUtility(utility: string): UtilityDeclaration[] | null {
  const values: Readonly<Record<string, string>> = {
    ordinal: 'ordinal',
    'slashed-zero': 'slashed-zero',
    'lining-nums': 'lining-nums',
    'oldstyle-nums': 'oldstyle-nums',
    'proportional-nums': 'proportional-nums',
    'tabular-nums': 'tabular-nums',
    'diagonal-fractions': 'diagonal-fractions',
    'stacked-fractions': 'stacked-fractions',
  };
  const channels = ['numeric-normal', ...Object.keys(values).map((value) => `numeric-${value}`)];
  if (utility === 'normal-nums') {
    return [
      {
        property: 'font-variant-numeric',
        value: 'normal',
        semanticGroup: 'numeric-normal',
        semanticConflicts: channels,
      },
    ];
  }
  const value = values[utility];
  if (!value) {
    return null;
  }
  const semanticGroup = `numeric-${utility}`;
  const semanticConflicts = [semanticGroup, 'numeric-normal'];
  return [
    { property: `--cssx-numeric-${utility}`, value, semanticGroup, semanticConflicts },
    { property: 'font-variant-numeric', value: CSSX_NUMERIC_SINK, semanticGroup, semanticConflicts },
  ];
}
