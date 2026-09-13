import { compileAnimationUtility } from './compile-animation-utility';
import { compileBackdropFilterUtility } from './compile-backdrop-filter-utility';
import { compileBackgroundUtility } from './compile-background-utility';
import { compileBorderWidthUtility } from './compile-border-width-utility';
import { compileColorUtility } from './compile-color-utility';
import { compileDimensionUtility } from './compile-dimension-utility';
import { compileFilterUtility } from './compile-filter-utility';
import { compileGradientUtility } from './compile-gradient-utility';
import { compileMaskUtility } from './compile-mask-utility';
import { compileModernUtility } from './compile-modern-utility';
import { compileMotionUtility } from './compile-motion-utility';
import { compileNumericUtility } from './compile-numeric-utility';
import { compilePrefixedFlexUtility } from './compile-prefixed-flex-utility';
import { compilePrefixedGridUtility } from './compile-prefixed-grid-utility';
import { compilePrefixedLayoutUtility } from './compile-prefixed-layout-utility';
import { compilePrefixedTypographyUtility } from './compile-prefixed-typography-utility';
import { compileRingUtility } from './compile-ring-utility';
import { compileShadowUtility } from './compile-shadow-utility';
import { compileSpacingUtility } from './compile-spacing-utility';
import { compileTextDecorationUtility } from './compile-text-decoration-utility';
import { compileTransformUtility } from './compile-transform-utility';
import { isMotionUtilityCandidate } from './is-motion-utility-candidate';
import type { CssxTheme } from './theme';
import { resolveSpacingValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Routes supported prefixed utilities to their specialized compiler.
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
  const borderWidth = compileBorderWidthUtility(utility);
  if (borderWidth) {
    return borderWidth;
  }
  const shadow = compileShadowUtility(utility);
  if (shadow) {
    return shadow;
  }
  const ring = compileRingUtility(utility, theme);
  if (ring) {
    return ring;
  }
  const numeric = compileNumericUtility(utility);
  if (numeric) {
    return numeric;
  }
  const filter = compileFilterUtility(utility, negative) ?? compileBackdropFilterUtility(utility, negative);
  if (filter) {
    return filter;
  }
  const background = compileBackgroundUtility(utility);
  if (background) {
    return background;
  }
  const mask = compileMaskUtility(utility, theme);
  if (mask) {
    return mask;
  }
  const gradient = compileGradientUtility(utility, negative, theme);
  if (gradient) {
    return gradient;
  }
  const color = compileColorUtility(utility, theme);
  if (color) {
    return color;
  }
  const decoration = compileTextDecorationUtility(utility, theme);
  if (decoration) {
    return decoration;
  }
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
  const transform = compileTransformUtility(utility, negative, theme);
  if (transform) {
    return transform;
  }
  return null;
}
