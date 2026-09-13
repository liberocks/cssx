import { NUMERIC_FONT_VARIANT_RESET_GROUPS, NUMERIC_FONT_VARIANT_VALUES } from './numeric-font-variant-values';
import { CSSX_NUMERIC_SINK } from './utility-effect-sinks';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles composable numeric font-variant utilities.
 *
 * @param utility Utility name without variants.
 * @returns Numeric declarations, or null when unsupported.
 */
export function compileNumericUtility(utility: string): UtilityDeclaration[] | null {
  if (utility === 'normal-nums') {
    return [
      {
        property: 'font-variant-numeric',
        value: 'normal',
        semanticGroup: 'numeric-normal',
        semanticConflicts: NUMERIC_FONT_VARIANT_RESET_GROUPS,
      },
    ];
  }
  const value = NUMERIC_FONT_VARIANT_VALUES[utility];
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
