import type { CssxTheme } from './theme';
import { resolveColorValue, resolveOpacityModifier, splitColorModifier } from './utility-resolvers';

/**
 * Resolves mask-stop colors including slash-opacity modifiers.
 *
 * @param raw Color segment from the utility name.
 * @param theme Active resolved theme.
 * @returns Resolved mask color, or null when unsupported.
 */
export function resolveMaskColor(raw: string, theme: CssxTheme): string | null {
  const modifier = splitColorModifier(raw);
  const color = resolveColorValue(modifier.value, theme);
  if (!color) {
    return null;
  }
  if (modifier.opacity === undefined) {
    return color;
  }
  const opacity = resolveOpacityModifier(modifier.opacity);
  return opacity === null ? null : `color-mix(in srgb, ${color} ${opacity}%, transparent)`;
}
