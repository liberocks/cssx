import type { CssxTheme } from './theme-types';

/**
 * Adds a live token and its transitive variable dependencies to a set.
 *
 * @param theme Active resolved theme.
 * @param name Token name to visit.
 * @param names Set of already collected names.
 * @returns Nothing after all live dependencies are collected.
 */
export function collectThemeTokenReferences(theme: CssxTheme, name: string, names: Set<string>): void {
  if (names.has(name) || theme.tokens[name] === undefined || theme.tokens[name] === 'initial') {
    return;
  }
  names.add(name);
  for (const match of theme.tokens[name]!.matchAll(/var\((--[a-z0-9_-]+)/gi)) {
    collectThemeTokenReferences(theme, match[1]!, names);
  }
}
