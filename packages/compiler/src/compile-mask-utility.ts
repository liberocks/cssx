import { compileArbitraryMaskUtility } from './compile-arbitrary-mask-utility';
import { compileExactMaskUtility } from './compile-exact-mask-utility';
import { compileMaskGradientUtility } from './compile-mask-gradient-utility';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

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
