import { resolveThemeTokenValue } from './resolve-theme-token-value';
import type { CssxTheme } from './theme-types';

/**
 * Resolves a theme token to its concrete value, including for media queries.
 *
 * @param theme Active resolved theme.
 * @param name Token name including its custom-property prefix.
 * @returns Concrete value, or undefined when the token is absent or reset.
 */
export function resolveThemeValue(theme: CssxTheme, name: string): string | undefined {
  const value = theme.tokens[name];
  if (value === undefined || value === 'initial') {
    return undefined;
  }
  return resolveThemeTokenValue(theme.tokens, value, new Set([name]));
}
