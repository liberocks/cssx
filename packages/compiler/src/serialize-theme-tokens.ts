import { referencedThemeTokens } from './referenced-theme-tokens';
import { rewriteThemeReferences } from './rewrite-theme-references';
import { themeTokenName } from './theme-token-name';
import type { CssxTheme } from './theme-types';

/**
 * Emits a variable root for non-inline themes, retaining only referenced values when possible.
 *
 * @param theme Active resolved theme.
 * @param css Utility CSS that may reference theme variables.
 * @returns Root variable CSS, or an empty string for inline or unused output.
 */
export function serializeThemeTokens(theme: CssxTheme, css: string): string {
  if (theme.mode === 'inline') {
    return '';
  }
  const names = theme.mode === 'static' ? Object.keys(theme.tokens) : referencedThemeTokens(theme, css);
  if (names.length === 0) {
    return '';
  }
  return `:root{${names
    .sort()
    .map((name) => `${themeTokenName(theme, name)}:${rewriteThemeReferences(theme, theme.tokens[name]!)}`)
    .join(';')}}`;
}
