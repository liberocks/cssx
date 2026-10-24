import { compileArbitraryContainUtility } from '../../compiler/compile-arbitrary-contain-utility';
import type { CssxTheme } from '../../theme/theme';
import type { UtilityDeclaration } from '../registry/utility-types';
import { compileSvgNumericUtility } from '../svg/compile-svg-numeric-utility';
import { compileFixedModernUtility } from './compile-fixed-modern-utility';
import { compileIntrinsicContainUtility } from './compile-intrinsic-contain-utility';

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
