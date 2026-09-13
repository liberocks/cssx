import { compileAnimationUtility } from './compile-animation-utility';
import { compileDimensionUtility } from './compile-dimension-utility';
import { compilePrefixedFlexUtility } from './compile-prefixed-flex-utility';
import { compilePrefixedGridUtility } from './compile-prefixed-grid-utility';
import { compilePrefixedLayoutUtility } from './compile-prefixed-layout-utility';
import { compilePrefixedTypographyUtility } from './compile-prefixed-typography-utility';
import { compileTransformUtility } from './compile-transform-utility';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

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
  const animation = /^animate-(.+)$/.exec(utility);
  if (animation) {
    return compileAnimationUtility(animation[1]!, theme);
  }
  return compileTransformUtility(utility, negative, theme);
}
