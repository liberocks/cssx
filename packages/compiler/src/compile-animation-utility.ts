import { resolveThemeToken } from './theme';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles one animation utility value.
 *
 * @param name Animation value without the utility prefix.
 * @param theme Active resolved theme.
 * @returns Animation declaration, or null when the value is unknown.
 */
export function compileAnimationUtility(name: string, theme: CssxTheme): UtilityDeclaration | null {
  if (name === 'none') {
    return { property: 'animation', value: 'none' };
  }
  if (name.startsWith('[') && name.endsWith(']')) {
    return { property: 'animation', value: name.slice(1, -1) };
  }
  const value = resolveThemeToken(theme, `--animate-${name}`);
  return value ? { property: 'animation', value } : null;
}
