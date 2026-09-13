import { compileOutlineColorUtility } from './compile-outline-color-utility';
import { compileOutlineOffsetUtility } from './compile-outline-offset-utility';
import { compileOutlineStyleUtility } from './compile-outline-style-utility';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles outline style, width, offset, and color utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns Outline declarations, or null when unsupported.
 */
export function compileOutlineUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration[] | null {
  const style = compileOutlineStyleUtility(utility);
  if (style) {
    return style;
  }
  const offset = compileOutlineOffsetUtility(utility, negative);
  if (offset) {
    return [offset];
  }
  const color = compileOutlineColorUtility(utility, theme);
  return color ? [color] : null;
}
