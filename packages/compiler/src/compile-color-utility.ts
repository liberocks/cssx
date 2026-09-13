import { compileArbitraryColorUtility } from './compile-arbitrary-color-utility';
import { resolveUtilityColor } from './resolve-utility-color';
import type { CssxTheme } from './theme';
import { resolveOpacityModifier, splitColorModifier } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/** CSS properties written by each supported color utility family. */
const COLOR_PROPERTIES: Readonly<Record<string, readonly string[]>> = {
  bg: ['background-color'],
  text: ['color'],
  border: ['border-color'],
  'border-x': ['border-left-color', 'border-right-color'],
  'border-y': ['border-top-color', 'border-bottom-color'],
  'border-s': ['border-inline-start-color'],
  'border-e': ['border-inline-end-color'],
  'border-bs': ['border-block-start-color'],
  'border-be': ['border-block-end-color'],
  'border-t': ['border-top-color'],
  'border-r': ['border-right-color'],
  'border-b': ['border-bottom-color'],
  'border-l': ['border-left-color'],
  accent: ['accent-color'],
  caret: ['caret-color'],
  fill: ['fill'],
  stroke: ['stroke'],
};

/**
 * Compiles foreground, background, border, and SVG color utilities.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Color declaration, or null when unsupported.
 */
export function compileColorUtility(
  utility: string,
  theme: CssxTheme,
): UtilityDeclaration | UtilityDeclaration[] | null {
  const match = /^(bg|text|border(?:-(x|y|s|e|bs|be|t|r|b|l))?|accent|caret|fill|stroke)-(.+)$/.exec(utility);
  if (!match) {
    return null;
  }
  const family = match[1]!;
  const modifier = splitColorModifier(match[3]!);
  const value = modifier.value;
  if (family === 'text' && /^(xs|sm|base|lg|xl|\d+xl)$/.test(value)) {
    return null;
  }
  const arbitrary = compileArbitraryColorUtility(family, value);
  if (arbitrary) {
    return arbitrary;
  }
  const resolved = resolveUtilityColor(value, theme);
  if (!resolved) {
    return null;
  }
  const opacity = modifier.opacity === undefined ? null : resolveOpacityModifier(modifier.opacity);
  if (modifier.opacity !== undefined && opacity === null) {
    return null;
  }
  const color = opacity === null ? resolved : `color-mix(in srgb, ${resolved} ${opacity}%, transparent)`;
  const propertiesForFamily = COLOR_PROPERTIES[family];
  return propertiesForFamily!.map((property) => ({ property, value: color }));
}
