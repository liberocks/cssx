import type { CssxTheme } from '../theme/theme';
import { compileModernUtility } from '../utilities/layout/compile-modern-utility';
import { compilePrefixedStructuralUtility } from '../utilities/layout/compile-prefixed-structural-utility';
import { compilePrefixedVisualUtility } from '../utilities/layout/compile-prefixed-visual-utility';
import { compileMotionUtility } from '../utilities/motion/compile-motion-utility';
import { isMotionUtilityCandidate } from '../utilities/motion/is-motion-utility-candidate';
import { compileBorderSpacingUtility } from '../utilities/paint/compile-border-spacing-utility';
import type { UtilityDeclaration } from '../utilities/registry/utility-types';
import { compileSpacingUtility } from '../utilities/spacing/compile-spacing-utility';

/**
 * Routes supported prefix-based utilities to their specialized compiler.
 *
 * The route order is intentional: families with overlapping prefixes run before
 * generic forms so a utility has one unambiguous declaration recipe.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns Declarations, or null when no compiler supports the utility.
 */
export function compilePrefixedUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | UtilityDeclaration[] | null {
  const motion = compileMotionUtility(utility, negative, theme);
  if (motion) {
    return motion;
  }
  if (isMotionUtilityCandidate(utility)) {
    return null;
  }
  const modern = compileModernUtility(utility, theme);
  if (modern) {
    return modern;
  }
  const spacing = compileSpacingUtility(utility, negative, theme);
  if (spacing) {
    return spacing;
  }
  const borderSpacing = compileBorderSpacingUtility(utility, negative, theme);
  if (borderSpacing) {
    return borderSpacing;
  }
  return (
    compilePrefixedVisualUtility(utility, negative, theme) ?? compilePrefixedStructuralUtility(utility, negative, theme)
  );
}
