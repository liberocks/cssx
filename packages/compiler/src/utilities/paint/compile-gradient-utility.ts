import type { CssxTheme } from '../../theme/theme';
import type { UtilityDeclaration } from '../registry/utility-types';
import { compileConicGradientUtility } from './compile-conic-gradient-utility';
import { compileDirectionalGradientUtility } from './compile-directional-gradient-utility';
import { compileGradientStopUtility } from './compile-gradient-stop-utility';
import { compileLinearGradientAngleUtility } from './compile-linear-gradient-angle-utility';
import { compileRadialGradientUtility } from './compile-radial-gradient-utility';

/**
 * Compiles gradient image, stop-color, and stop-position utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the gradient angle is negated.
 * @param theme Active resolved theme.
 * @returns Gradient declarations, or null when unsupported.
 */
export function compileGradientUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration[] | null {
  return (
    compileDirectionalGradientUtility(utility) ??
    compileRadialGradientUtility(utility) ??
    compileConicGradientUtility(utility, negative) ??
    compileLinearGradientAngleUtility(utility, negative) ??
    compileGradientStopUtility(utility, theme)
  );
}
