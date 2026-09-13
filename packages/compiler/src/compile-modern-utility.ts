import { compileArbitraryContainUtility } from './compile-arbitrary-contain-utility';
import { compileFixedModernUtility } from './compile-fixed-modern-utility';
import { compileIntrinsicContainUtility } from './compile-intrinsic-contain-utility';
import { compileSvgNumericUtility } from './compile-svg-numeric-utility';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles newer platform utility families and fixed declarations.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Declaration, or null when unsupported.
 */
export function compileModernUtility(utility: string, theme: CssxTheme): UtilityDeclaration | null {
  return (
    compileFixedModernUtility(utility) ??
    compileArbitraryContainUtility(utility) ??
    compileIntrinsicContainUtility(utility, theme) ??
    compileSvgNumericUtility(utility)
  );
}
