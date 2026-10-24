import { resolveUtilityColor } from '../../shared/resolve-utility-color';
import type { CssxTheme } from '../../theme/theme';
import type { UtilityDeclaration } from '../registry/utility-types';
import { resolveOpacityModifier, splitColorModifier } from '../values/utility-resolvers';

/**
 * Resolves ring colors and optional opacity modifiers.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Ring color declarations, or null when another recipe applies.
 */
export function compileRingColorUtility(utility: string, theme: CssxTheme): UtilityDeclaration[] | null {
  const match = /^ring-(.+)$/.exec(utility);
  if (!match) {
    return null;
  }
  const modifier = splitColorModifier(match[1]!);
  const color = resolveUtilityColor(modifier.value, theme);
  if (!color) {
    return null;
  }
  const opacity = modifier.opacity === undefined ? null : resolveOpacityModifier(modifier.opacity);
  if (modifier.opacity !== undefined && opacity === null) {
    return null;
  }
  return [
    {
      property: '--cssx-ring-color',
      value: opacity === null ? color : `color-mix(in srgb, ${color} ${opacity}%, transparent)`,
      semanticGroup: 'ring-color',
    },
  ];
}
