import type { CssxTheme } from '../../theme/theme';
import { compileAnimationUtility } from '../motion/compile-animation-utility';
import { compileTransformUtility } from '../motion/compile-transform-utility';
import type { UtilityDeclaration } from '../registry/utility-types';
import { compilePrefixedTypographyUtility } from '../typography/compile-prefixed-typography-utility';
import { compileDimensionUtility } from './compile-dimension-utility';
import { compilePrefixedFlexUtility } from './compile-prefixed-flex-utility';
import { compilePrefixedGridUtility } from './compile-prefixed-grid-utility';
import { compilePrefixedLayoutUtility } from './compile-prefixed-layout-utility';

/**
 * Routes dimension, layout, grid, flex, typography, and transform utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether a value is negated.
 * @param theme Active resolved theme.
 * @returns Declarations, or null when no structural recipe supports the utility.
 */
export function compilePrefixedStructuralUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | UtilityDeclaration[] | null {
  const dimension = compileDimensionUtility(utility, negative, theme);
  if (dimension) {
    return dimension;
  }
  const layout = compilePrefixedLayoutUtility(utility);
  if (layout) {
    return layout;
  }
  const grid = compilePrefixedGridUtility(utility, negative);
  if (grid) {
    return grid;
  }
  const flex = compilePrefixedFlexUtility(utility, negative, theme);
  if (flex) {
    return flex;
  }
  const typography = compilePrefixedTypographyUtility(utility, negative, theme);
  if (typography) {
    return typography;
  }
  return compileAnimationUtility(utility, theme) ?? compileTransformUtility(utility, negative, theme);
}
