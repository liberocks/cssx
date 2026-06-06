import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';
import { cloneDeclarations } from './utility-values';
import {
  resolveBorderWidthValue,
  resolveColorValue,
  resolveOpacityModifier,
  resolveSpacingValue,
  resolveDimensionValue,
  splitColorModifier,
} from './utility-resolvers';

/**
 * Compiles directional border-width utilities.
 *
 * @param utility Utility name without variants.
 * @returns Border-width declarations, or null when unsupported.
 */
export function compileBorderWidthUtility(utility: string): UtilityDeclaration | UtilityDeclaration[] | null {
  const match = /^border-(x|y|t|r|b|l)-(0|2|4|8)$/.exec(utility);
  if (!match) {
    return null;
  }
  const side = match[1] ?? '';
  const value = `${match[2] ?? ''}px`.replace('0px', '0');
  const properties: Readonly<Record<string, readonly string[]>> = {
    x: ['border-left-width', 'border-right-width'],
    y: ['border-top-width', 'border-bottom-width'],
    t: ['border-top-width'],
    r: ['border-right-width'],
    b: ['border-bottom-width'],
    l: ['border-left-width'],
  };
  return (properties[side] ?? []).map((property) => ({ property, value }));
}

/**
 * Compiles spacing, gap, inset, and positional utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns Spacing declarations, or null when unsupported.
 */
export function compileSpacingUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | UtilityDeclaration[] | null {
  const match =
    /^(px|py|pt|pr|pb|pl|ps|pe|p|mx|my|mt|mr|mb|ml|ms|me|m|gap-x|gap-y|gap|inset-x|inset-y|inset-s|inset-e|inset|top|right|bottom|left)-(.+)$/.exec(
      utility,
    );
  if (!match) {
    return null;
  }
  const prefix = match[1] ?? '';
  const rawValue = match[2] ?? '';
  const value = prefix.startsWith('inset')
    ? resolveDimensionValue(rawValue, negative, theme, 'inset')
    : rawValue === 'auto' && prefix.startsWith('m') && !negative
      ? 'auto'
      : resolveSpacingValue(rawValue, negative, theme);
  if (!value) {
    return null;
  }
  const properties: Readonly<Record<string, readonly string[]>> = {
    p: ['padding'],
    px: ['padding-left', 'padding-right'],
    py: ['padding-top', 'padding-bottom'],
    pt: ['padding-top'],
    pr: ['padding-right'],
    pb: ['padding-bottom'],
    pl: ['padding-left'],
    ps: ['padding-inline-start'],
    pe: ['padding-inline-end'],
    m: ['margin'],
    mx: ['margin-left', 'margin-right'],
    my: ['margin-top', 'margin-bottom'],
    mt: ['margin-top'],
    mr: ['margin-right'],
    mb: ['margin-bottom'],
    ml: ['margin-left'],
    ms: ['margin-inline-start'],
    me: ['margin-inline-end'],
    gap: ['gap'],
    'gap-x': ['column-gap'],
    'gap-y': ['row-gap'],
    top: ['top'],
    right: ['right'],
    bottom: ['bottom'],
    left: ['left'],
    inset: ['inset'],
    'inset-x': ['left', 'right'],
    'inset-y': ['top', 'bottom'],
    'inset-s': ['inset-inline-start'],
    'inset-e': ['inset-inline-end'],
  };
  const targets = properties[prefix];
  return targets?.map((property) => ({ property, value })) ?? null;
}

/**
 * Compiles sibling spacing utilities with a shared reverse channel.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns Scoped sibling declarations, or null when unsupported.
 */
export function compileSpaceUtility(utility: string, negative: boolean, theme: CssxTheme): UtilityDeclaration[] | null {
  const match = /^space-(x|y)-(.+)$/.exec(utility);
  if (!match) {
    return null;
  }
  const axis = match[1] ?? '';
  const rawValue = match[2] ?? '';
  const selectorSuffix = ' > :not(:last-child)';
  const semanticGroup = rawValue === 'reverse' ? `space-${axis}-reverse` : `space-${axis}`;
  const reverseProperty = `--cssx-space-${axis}-reverse`;
  if (rawValue === 'reverse') {
    return [{ property: reverseProperty, value: '1', selectorSuffix, semanticGroup }];
  }
  const value = resolveSpacingValue(rawValue, negative, theme);
  if (!value) {
    return null;
  }
  const [start, end] = axis === 'x' ? ['margin-left', 'margin-right'] : ['margin-top', 'margin-bottom'];
  return [
    { property: reverseProperty, value: '0', selectorSuffix, semanticGroup },
    { property: start, value: `calc(${value} * calc(1 - var(${reverseProperty})))`, selectorSuffix, semanticGroup },
    { property: end, value: `calc(${value} * var(${reverseProperty}))`, selectorSuffix, semanticGroup },
  ];
}

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
    const axis = axisMatch[1] ?? '';
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
