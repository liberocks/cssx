import { compileBoxSpacingUtility } from './compile-box-spacing-utility';
import { compilePositionSpacingUtility } from './compile-position-spacing-utility';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles spacing, gap, inset, and positional utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns Spacing declarations, or null when unsupported.
 */
export function compileSpacingUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | UtilityDeclaration[] | null {
  return compileBoxSpacingUtility(utility, negative, theme) ?? compilePositionSpacingUtility(utility, negative, theme);
}
