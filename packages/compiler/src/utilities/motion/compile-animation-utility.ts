import { resolveThemeToken } from '../../theme/theme';
import type { CssxTheme } from '../../theme/theme';
import type { UtilityDeclaration } from '../registry/utility-types';
import { resolveArbitraryCssValue } from '../values/utility-resolvers';

/**
 * Compiles a named, arbitrary, or theme-backed animation utility.
 *
 * @param utility Complete animation utility without variants.
 * @param theme Active resolved theme.
 * @returns Animation declaration, or null when another recipe applies.
 */
export function compileAnimationUtility(utility: string, theme: CssxTheme): UtilityDeclaration | null {
  const match = /^animate-(.+)$/.exec(utility);
  if (!match) {
    return null;
  }
  const name = match[1]!;
  if (name === 'none') {
    return { property: 'animation', value: 'none' };
  }
  if (name.startsWith('[') && name.endsWith(']')) {
    return { property: 'animation', value: resolveArbitraryCssValue(name) };
  }
  const value = resolveThemeToken(theme, `--animate-${name}`);
  return value ? { property: 'animation', value } : null;
}
