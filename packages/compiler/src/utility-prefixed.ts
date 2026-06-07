import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';
import { compileBorderWidthUtility, compileSpacingUtility } from './utility-box-model';
import { compileBackdropFilterUtility, compileFilterUtility, compileRingUtility } from './utility-effects';
import { compileColorUtility, compileGradientUtility, compileTextDecorationUtility } from './utility-paint';
import { compileAnimationUtility, compileDimensionUtility, compileTransformUtility } from './utility-transform';
import { compileModernUtility } from './utility-modern';
import { compileBackgroundUtility, compileMaskUtility, compileNumericUtility } from './utility-visual-basics';
import { flexValue, resolveArbitraryCssValue, resolveDimensionValue, resolveSpacingValue } from './utility-resolvers';
import { leadingValue, millisecondsValue, trackingValue } from './utility-values';

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
    const value = resolveSpacingValue(borderSpacing[2] ?? '', negative, theme);
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
  const mask = compileMaskUtility(utility);
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

  const columns = /^columns-(auto|\d+|\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (columns) {
    const value = columns[1] ?? '';
    return {
      property: 'columns',
      value: value.startsWith('[') || value.startsWith('(') ? resolveArbitraryCssValue(value) : value,
    };
  }
  if (utility === 'content-none') {
    return { property: 'content', value: 'none' };
  }
  const content = /^content-(\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (content) {
    return { property: 'content', value: resolveArbitraryCssValue(content[1] ?? '') };
  }
  const breakUtility =
    /^(?:break-(before|after)-(auto|avoid|all|avoid-page|page|left|right|column)|break-(inside)-(auto|avoid|avoid-page|avoid-column))$/.exec(
      utility,
    );
  if (breakUtility) {
    const family = breakUtility[1] ?? breakUtility[3] ?? '';
    const value = breakUtility[2] ?? breakUtility[4] ?? '';
    return { property: `break-${family}`, value };
  }
  const object = /^object-(\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (object) {
    return { property: 'object-position', value: resolveArbitraryCssValue(object[1] ?? '') };
  }
  const tabSize = /^tab-(\d+|\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (tabSize) {
    const value = tabSize[1] ?? '';
    return {
      property: 'tab-size',
      value: value.startsWith('[') || value.startsWith('(') ? resolveArbitraryCssValue(value) : value,
    };
  }
  const listImage = /^list-image-(\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (listImage) {
    return { property: 'list-style-image', value: resolveArbitraryCssValue(listImage[1] ?? '') };
  }
  const clamp = /^line-clamp-(none|\d+)$/.exec(utility);
  if (clamp) {
    return clamp[1] === 'none'
      ? [
          { property: 'overflow', value: 'visible', semanticGroup: 'line-clamp' },
          { property: 'display', value: 'block', semanticGroup: 'line-clamp' },
          { property: '-webkit-box-orient', value: 'horizontal', semanticGroup: 'line-clamp' },
