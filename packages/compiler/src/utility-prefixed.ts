import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';
import { compileBorderWidthUtility, compileSpacingUtility } from './utility-box-model';
import { compileBackdropFilterUtility, compileFilterUtility, compileRingUtility } from './utility-effects';
import { compileColorUtility, compileGradientUtility, compileTextDecorationUtility } from './utility-paint';
import { compileAnimationUtility, compileDimensionUtility, compileTransformUtility } from './utility-transform';
import { compileModernUtility } from './utility-modern';
import { compileMotionUtility, isMotionUtilityCandidate } from './utility-motion';
import { compileBackgroundUtility, compileMaskUtility, compileNumericUtility } from './utility-visual-basics';
import { flexValue, resolveArbitraryCssValue, resolveDimensionValue, resolveSpacingValue } from './utility-resolvers';
import { leadingValue, trackingValue } from './utility-values';

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
          { property: '-webkit-line-clamp', value: 'unset', semanticGroup: 'line-clamp' },
        ]
      : [
          { property: 'overflow', value: 'hidden', semanticGroup: 'line-clamp' },
          { property: 'display', value: '-webkit-box', semanticGroup: 'line-clamp' },
          { property: '-webkit-box-orient', value: 'vertical', semanticGroup: 'line-clamp' },
          { property: '-webkit-line-clamp', value: clamp[1] ?? '', semanticGroup: 'line-clamp' },
        ];
  }

  const grid = /^grid-cols-(\d+)$/.exec(utility);
  if (grid) {
    return { property: 'grid-template-columns', value: `repeat(${grid[1]}, minmax(0, 1fr))` };
  }
  if (utility === 'grid-cols-subgrid') {
    return { property: 'grid-template-columns', value: 'subgrid' };
  }
  const gridRows = /^grid-rows-(\d+)$/.exec(utility);
  if (gridRows) {
    return { property: 'grid-template-rows', value: `repeat(${gridRows[1]}, minmax(0, 1fr))` };
  }
  if (utility === 'grid-rows-subgrid') {
    return { property: 'grid-template-rows', value: 'subgrid' };
  }
  const span = /^(col|row)-span-(\d+|full)$/.exec(utility);
  if (span) {
    return {
      property: span[1] === 'col' ? 'grid-column' : 'grid-row',
      value: span[2] === 'full' ? '1 / -1' : `span ${span[2]} / span ${span[2]}`,
    };
  }
  const gridLine = /^(col|row)-(start|end)-(\d+|auto)$/.exec(utility);
  if (gridLine) {
    return {
      property: `grid-${gridLine[1] === 'col' ? 'column' : 'row'}-${gridLine[2]}`,
      value: gridLine[3] === 'auto' ? 'auto' : (gridLine[3] ?? ''),
    };
  }
  const order = /^order-(first|last|none|\d+)$/.exec(utility);
  if (order) {
    const values: Readonly<Record<string, string>> = { first: '-9999', last: '9999', none: '0' };
    const value = values[order[1] ?? ''] ?? order[1] ?? '';
    return {
      property: 'order',
      value: negative && value !== '0' ? (value.startsWith('-') ? value.slice(1) : `-${value}`) : value,
    };
  }
  const basis = /^basis-(.+)$/.exec(utility);
  if (basis) {
    const value = resolveDimensionValue(basis[1] ?? '', negative, theme, 'basis');
    return value ? { property: 'flex-basis', value } : null;
  }
  const flex = /^flex-(\d+(?:\/\d+)?|\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (flex) {
    const raw = flex[1] ?? '';
    const value = raw.startsWith('[') || raw.startsWith('(') ? resolveArbitraryCssValue(raw) : flexValue(raw);
    return value ? { property: 'flex', value } : null;
  }
  const opacity = /^opacity-(\d{1,3})$/.exec(utility);
  if (opacity) {
    return { property: 'opacity', value: String(Number(opacity[1]) / 100) };
  }
  const zIndex = /^z-(\d+|auto)$/.exec(utility);
  if (zIndex) {
    return { property: 'z-index', value: zIndex[1] ?? 'auto' };
  }
  const leading = /^leading-(none|tight|snug|normal|relaxed|loose|\[[^\]]+\])$/.exec(utility);
  if (leading) {
    return { property: 'line-height', value: leadingValue(leading[1] ?? '') };
  }
  const font = /^font-(\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (font) {
    return { property: 'font-family', value: resolveArbitraryCssValue(font[1] ?? '') };
  }
  const tracking = /^tracking-(tighter|tight|normal|wide|wider|widest)$/.exec(utility);
  if (tracking) {
    return { property: 'letter-spacing', value: trackingValue(tracking[1] ?? '') };
  }
  const animation = /^animate-(.+)$/.exec(utility);
  if (animation) {
    return compileAnimationUtility(animation[1] ?? '', theme);
  }
  const transform = compileTransformUtility(utility, negative, theme);
  if (transform) {
    return transform;
  }
  return null;
}
