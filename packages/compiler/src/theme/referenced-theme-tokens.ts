import { collectThemeTokenReferences } from './collect-theme-token-references';
import type { CssxTheme } from './theme-types';

/**
 * Collects theme tokens referenced by CSS and all tokens they depend on.
 *
 * @param theme Active resolved theme.
 * @param css Utility CSS to inspect.
 * @returns Referenced token names in first-seen order.
 */
export function referencedThemeTokens(theme: CssxTheme, css: string): string[] {
  const prefix = theme.prefix ? `--${theme.prefix}-` : '--';
  const names = new Set<string>();
  const expression = new RegExp(`var\\((${prefix.replace('-', '\\-')}[a-z0-9_-]+)`, 'gi');
  for (const match of css.matchAll(expression)) {
    const variable = match[1]!;
    const name = theme.prefix ? `--${variable.slice(prefix.length)}` : variable;
    collectThemeTokenReferences(theme, name, names);
  }
  return [...names];
}
