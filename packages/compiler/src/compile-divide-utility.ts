import type { CssxTheme } from './theme';
import {
  resolveBorderWidthValue,
  resolveColorValue,
  resolveOpacityModifier,
  splitColorModifier,
} from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles sibling divider width, direction, and color utilities.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Scoped divider declarations, or null when unsupported.
 */
export function compileDivideUtility(utility: string, theme: CssxTheme): UtilityDeclaration[] | null {
  const selectorSuffix = ' > :not(:last-child)';
  const axisMatch = /^divide-(x|y)(?:-(.+))?$/.exec(utility);
  if (axisMatch) {
    const axis = axisMatch[1]!;
    const rawValue = axisMatch[2] ?? 'DEFAULT';
    const reverseProperty = `--cssx-divide-${axis}-reverse`;
    const semanticGroup = rawValue === 'reverse' ? `divide-${axis}-reverse` : `divide-${axis}`;
    if (rawValue === 'reverse') {
      return [{ property: reverseProperty, value: '1', selectorSuffix, semanticGroup }];
    }
    const value = rawValue === 'DEFAULT' ? '1px' : resolveBorderWidthValue(rawValue);
    if (!value) {
      return null;
    }
    const [start, end] =
      axis === 'x' ? ['border-left-width', 'border-right-width'] : ['border-top-width', 'border-bottom-width'];
    return [
      { property: reverseProperty, value: '0', selectorSuffix, semanticGroup },
      { property: start, value: `calc(${value} * calc(1 - var(${reverseProperty})))`, selectorSuffix, semanticGroup },
      { property: end, value: `calc(${value} * var(${reverseProperty}))`, selectorSuffix, semanticGroup },
    ];
  }

  const colorMatch = /^divide-(.+)$/.exec(utility);
  if (!colorMatch) {
    return null;
  }
  const modifier = splitColorModifier(colorMatch[1]!);
  const resolved = resolveColorValue(modifier.value, theme);
  if (!resolved) {
    return null;
  }
  const opacity = modifier.opacity === undefined ? null : resolveOpacityModifier(modifier.opacity);
  if (modifier.opacity !== undefined && opacity === null) {
    return null;
  }
  const value = opacity === null ? resolved : `color-mix(in srgb, ${resolved} ${opacity}%, transparent)`;
  return [{ property: 'border-color', value, selectorSuffix, semanticGroup: 'divide-color' }];
}
