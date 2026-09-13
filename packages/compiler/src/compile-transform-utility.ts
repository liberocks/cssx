import { compileRotateUtility } from './compile-rotate-utility';
import { compileScaleUtility } from './compile-scale-utility';
import { compileSkewUtility } from './compile-skew-utility';
import { compileTranslateUtility } from './compile-translate-utility';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves transform-channel utilities through their focused compilers.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns Transform declarations, or null when unsupported.
 */
export function compileTransformUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration[] | null {
  return (
    compileTranslateUtility(utility, negative, theme) ??
    compileRotateUtility(utility, negative) ??
    compileScaleUtility(utility, negative) ??
    compileSkewUtility(utility, negative)
  );
}
