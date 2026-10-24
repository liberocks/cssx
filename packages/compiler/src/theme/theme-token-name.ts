import type { CssxTheme } from './theme-types';

/**
 * Gets the emitted custom-property name for a logical token name.
 *
 * @param theme Active resolved theme.
 * @param name Logical token name.
 * @returns Emitted custom-property name.
 */
export function themeTokenName(theme: CssxTheme, name: string): string {
  return theme.prefix ? `--${theme.prefix}-${name.slice(2)}` : name;
}
