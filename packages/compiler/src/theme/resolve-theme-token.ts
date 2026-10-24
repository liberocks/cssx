import { resolveThemeValue } from './resolve-theme-value';
import { themeTokenName } from './theme-token-name';
import type { CssxTheme } from './theme-types';

/**
 * Resolves a token for normal declaration output.
 *
 * @param theme Active resolved theme.
 * @param name Token name including its custom-property prefix.
 * @returns Concrete value for inline mode or a variable reference for other modes.
 */
export function resolveThemeToken(theme: CssxTheme, name: string): string | undefined {
  const value = resolveThemeValue(theme, name);
  if (value === undefined) {
    return undefined;
  }
  return theme.mode === 'inline' ? value : `var(${themeTokenName(theme, name)})`;
}
