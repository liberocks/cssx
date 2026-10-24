import { themeTokenName } from './theme-token-name';
import type { CssxTheme } from './theme-types';

/**
 * Rewrites token references to use the configured output prefix.
 *
 * @param theme Active resolved theme.
 * @param value Raw token value.
 * @returns Value with rewritten variable references.
 */
export function rewriteThemeReferences(theme: CssxTheme, value: string): string {
  return value.replace(/var\((--[a-z0-9_-]+)/gi, (_match, name: string) => `var(${themeTokenName(theme, name)}`);
}
