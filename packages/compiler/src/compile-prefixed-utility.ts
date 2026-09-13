import { compileModernUtility } from './compile-modern-utility';
import { compileMotionUtility } from './compile-motion-utility';
import { compilePrefixedStructuralUtility } from './compile-prefixed-structural-utility';
import { compilePrefixedVisualUtility } from './compile-prefixed-visual-utility';
import { compileSpacingUtility } from './compile-spacing-utility';
import { isMotionUtilityCandidate } from './is-motion-utility-candidate';
import type { CssxTheme } from './theme';
import { resolveSpacingValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

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
  const borderSpacing = /^border-spacing(?:-(x|y))?-(.+)$/.exec(utility);
  if (borderSpacing) {
    const axis = borderSpacing[1];
    const value = resolveSpacingValue(borderSpacing[2]!, negative, theme);
    if (!value) {
      return null;
    }
    if (!axis) {
      return { property: 'border-spacing', value };
    }
    const variable = `--cssx-border-spacing-${axis}`;
    return [
      { property: variable, value, semanticGroup: `border-spacing-${axis}` },
      {
        property: 'border-spacing',
        value: 'var(--cssx-border-spacing-x, 0) var(--cssx-border-spacing-y, 0)',
        semanticGroup: `border-spacing-${axis}`,
      },
    ];
  }
  return (
    compilePrefixedVisualUtility(utility, negative, theme) ?? compilePrefixedStructuralUtility(utility, negative, theme)
  );
}
