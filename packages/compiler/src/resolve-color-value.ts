import { resolveThemeToken } from './theme';
import type { CssxTheme } from './theme';

/**
 * Resolves an arbitrary or theme-backed color.
 *
 * @param raw Utility color value.
 * @param theme Active resolved theme.
 * @returns CSS color, or null when no token exists.
 */
export function resolveColorValue(raw: string, theme: CssxTheme): string | null {
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw.slice(1, -1);
  }
  return resolveThemeToken(theme, `--color-${raw}`) ?? null;
}
