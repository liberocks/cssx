import { resolveThemeToken } from './theme';
import type { CssxTheme } from './theme';
import { resolveArbitraryCssValue } from './utility-resolvers';

/**
 * Resolves arbitrary syntax first, then a named theme token.
 *
 * @param raw Utility value.
 * @param token Theme token name.
 * @param theme Active resolved theme.
 * @returns CSS value, or null when unknown.
 */
export function resolveNamedValue(raw: string, token: string, theme: CssxTheme): string | null {
  if ((raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('(') && raw.endsWith(')'))) {
    return resolveArbitraryCssValue(raw);
  }
  return resolveThemeToken(theme, token) ?? null;
}
