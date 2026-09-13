import { compileBackdropFilterUtility } from './compile-backdrop-filter-utility';
import { compileBackgroundUtility } from './compile-background-utility';
import { compileBorderWidthUtility } from './compile-border-width-utility';
import { compileColorUtility } from './compile-color-utility';
import { compileFilterUtility } from './compile-filter-utility';
import { compileGradientUtility } from './compile-gradient-utility';
import { compileMaskUtility } from './compile-mask-utility';
import { compileNumericUtility } from './compile-numeric-utility';
import { compileRingUtility } from './compile-ring-utility';
import { compileShadowUtility } from './compile-shadow-utility';
import { compileTextDecorationUtility } from './compile-text-decoration-utility';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

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
