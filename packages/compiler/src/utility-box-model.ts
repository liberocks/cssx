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
  const side = match[1]!;
  const value = `${match[2]!}px`.replace('0px', '0');
  const properties: Readonly<Record<string, readonly string[]>> = {
    x: ['border-left-width', 'border-right-width'],
    y: ['border-top-width', 'border-bottom-width'],
    t: ['border-top-width'],
    r: ['border-right-width'],
    b: ['border-bottom-width'],
    l: ['border-left-width'],
  };
  return properties[side]!.map((property) => ({ property, value }));
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
  const prefix = match[1]!;
  const rawValue = match[2]!;
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
  return targets!.map((property) => ({ property, value }));
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
  const axis = match[1]!;
  const rawValue = match[2]!;
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

/**
 * Compiles placeholder color utilities.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Placeholder declarations, or null when unsupported.
 */
export function compilePlaceholderUtility(utility: string, theme: CssxTheme): UtilityDeclaration[] | null {
  const match = /^placeholder-(.+)$/.exec(utility);
  if (!match) {
    return null;
  }
  const modifier = splitColorModifier(match[1]!);
  const resolved = resolveColorValue(modifier.value, theme);
  if (!resolved) {
    return null;
  }
  const opacity = modifier.opacity === undefined ? null : resolveOpacityModifier(modifier.opacity);
  if (modifier.opacity !== undefined && opacity === null) {
    return null;
  }
  const value = opacity === null ? resolved : `color-mix(in srgb, ${resolved} ${opacity}%, transparent)`;
  return [{ property: 'color', value, selectorSuffix: '::placeholder', semanticGroup: 'placeholder-color' }];
}

/**
 * Compiles outline style, width, offset, and color utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns Outline declarations, or null when unsupported.
 */
export function compileOutlineUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration[] | null {
  const exact: Readonly<Record<string, readonly UtilityDeclaration[]>> = {
    outline: [
      { property: 'outline-style', value: 'solid' },
      { property: 'outline-width', value: '1px' },
    ],
    'outline-none': [{ property: 'outline-style', value: 'none' }],
    'outline-hidden': [
      { property: 'outline', value: '2px solid transparent' },
      { property: 'outline-offset', value: '2px' },
    ],
    'outline-solid': [{ property: 'outline-style', value: 'solid' }],
    'outline-dashed': [{ property: 'outline-style', value: 'dashed' }],
    'outline-dotted': [{ property: 'outline-style', value: 'dotted' }],
    'outline-double': [{ property: 'outline-style', value: 'double' }],
  };
  const declaration = exact[utility];
  if (declaration) {
    return cloneDeclarations(declaration);
  }

  const offset = /^outline-offset-(.+)$/.exec(utility);
  if (offset) {
    const value = resolveSpacingValue(offset[1]!, negative, theme);
    return value ? [{ property: 'outline-offset', value }] : null;
  }
  const width = /^outline-(0|1|2|4|8|\[[^\]]+\])$/.exec(utility);
  if (width) {
    const raw = width[1]!;
    return [
      { property: 'outline-width', value: raw.startsWith('[') ? raw.slice(1, -1) : `${raw}px`.replace('0px', '0') },
    ];
  }
  const color = /^outline-(.+)$/.exec(utility);
  if (!color) {
    return null;
  }
  const modifier = splitColorModifier(color[1]!);
  const resolved = resolveColorValue(modifier.value, theme);
  if (!resolved) {
    return null;
  }
  const opacity = modifier.opacity === undefined ? null : resolveOpacityModifier(modifier.opacity);
  if (modifier.opacity !== undefined && opacity === null) {
    return null;
  }
  return [
    {
      property: 'outline-color',
      value: opacity === null ? resolved : `color-mix(in srgb, ${resolved} ${opacity}%, transparent)`,
    },
  ];
}
