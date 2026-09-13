import type { CssxTheme } from './theme';
import { resolveColorValue } from './utility-resolvers';

/**
 * Resolves utility-only color keywords and theme colors.
 *
 * @param value Color utility value.
 * @param theme Active resolved theme.
 * @returns CSS color, or null when unknown.
 */
export function resolveUtilityColor(value: string, theme: CssxTheme): string | null {
  if (value === 'current') {
    return 'currentColor';
  }
  if (value === 'inherit') {
    return 'inherit';
  }
  return resolveColorValue(value, theme);
}
