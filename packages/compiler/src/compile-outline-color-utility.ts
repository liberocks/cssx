import type { CssxTheme } from './theme';
import { resolveColorValue, resolveOpacityModifier, splitColorModifier } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves theme-aware outline color utilities and opacity modifiers.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns The color declaration, or null when another recipe applies.
 */
export function compileOutlineColorUtility(utility: string, theme: CssxTheme): UtilityDeclaration | null {
  const match = /^outline-(.+)$/.exec(utility);
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
  return {
    property: 'outline-color',
    value: opacity === null ? resolved : `color-mix(in srgb, ${resolved} ${opacity}%, transparent)`,
  };
}
