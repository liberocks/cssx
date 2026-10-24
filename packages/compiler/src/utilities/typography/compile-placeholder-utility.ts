import type { CssxTheme } from '../../theme/theme';
import type { UtilityDeclaration } from '../registry/utility-types';
import { resolveColorValue, resolveOpacityModifier, splitColorModifier } from '../values/utility-resolvers';

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
