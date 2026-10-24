import { compileNumericUtility } from '../../compiler/compile-numeric-utility';
import type { CssxTheme } from '../../theme/theme';
import { compileBackdropFilterUtility } from '../paint/compile-backdrop-filter-utility';
import { compileBackgroundUtility } from '../paint/compile-background-utility';
import { compileBorderWidthUtility } from '../paint/compile-border-width-utility';
import { compileColorUtility } from '../paint/compile-color-utility';
import { compileFilterUtility } from '../paint/compile-filter-utility';
import { compileGradientUtility } from '../paint/compile-gradient-utility';
import { compileMaskUtility } from '../paint/compile-mask-utility';
import { compileRingUtility } from '../paint/compile-ring-utility';
import { compileShadowUtility } from '../paint/compile-shadow-utility';
import type { UtilityDeclaration } from '../registry/utility-types';
import { compileTextDecorationUtility } from '../typography/compile-text-decoration-utility';

/**
 * Routes paint, filter, border, and decoration utilities to their compilers.
 *
 * @param utility Utility name without variants.
 * @param negative Whether a value is negated.
 * @param theme Active resolved theme.
 * @returns Declarations, or null when no visual recipe supports the utility.
 */
export function compilePrefixedVisualUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | UtilityDeclaration[] | null {
  return (
    compileBorderWidthUtility(utility) ??
    compileShadowUtility(utility) ??
    compileRingUtility(utility, theme) ??
    compileNumericUtility(utility) ??
    compileFilterUtility(utility, negative) ??
    compileBackdropFilterUtility(utility, negative) ??
    compileBackgroundUtility(utility) ??
    compileMaskUtility(utility, theme) ??
    compileGradientUtility(utility, negative, theme) ??
    compileColorUtility(utility, theme) ??
    compileTextDecorationUtility(utility, theme)
  );
}
