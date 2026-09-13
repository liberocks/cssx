import type { CssxTheme } from './theme';
import { resolveThemeValue } from './theme';

/** Resolves theme variables in an animation declaration for resource discovery. */
export function resolveAnimationThemeReferences(value: string, theme: CssxTheme): string {
  return value.replaceAll(/var\((--[a-z0-9_-]+)\)/gi, (reference, emittedName: string) => {
    const prefix = theme.prefix ? `--${theme.prefix}-` : '';
    const tokenName = prefix && emittedName.startsWith(prefix) ? `--${emittedName.slice(prefix.length)}` : emittedName;
    return resolveThemeValue(theme, tokenName) ?? reference;
  });
}