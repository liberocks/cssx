import type { CssxTheme } from '../../theme/theme';
import type { UtilityDeclaration } from '../registry/utility-types';
import { compileArbitraryMaskUtility } from './compile-arbitrary-mask-utility';
import { compileExactMaskUtility } from './compile-exact-mask-utility';
import { compileMaskGradientUtility } from './compile-mask-gradient-utility';

/**
 * Compiles fixed and arbitrary mask utilities.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Mask declaration, or null when unsupported.
 */
export function compileMaskUtility(
  utility: string,
  theme: CssxTheme,
): UtilityDeclaration | UtilityDeclaration[] | null {
  return (
    compileExactMaskUtility(utility) ??
    compileArbitraryMaskUtility(utility) ??
    compileMaskGradientUtility(utility, theme)
  );
}
