import { resolveThemeToken } from '../theme/theme';
import type { CssxTheme } from '../theme/theme';
import { resolveArbitraryCssValue, resolveSpacingValue } from '../utilities/values/utility-resolvers';

/**
 * Resolves an optional line-height modifier on a text-size utility.
 *
 * @param value Line-height modifier source.
 * @param theme Active CSSX theme.
 * @returns A resolved value, null for invalid arbitrary syntax, or undefined when missing.
 */
export function resolveLineHeight(value: string, theme: CssxTheme): string | null | undefined {
  if (value.startsWith('[') || value.startsWith('(')) {
    return resolveArbitraryCssValue(value);
  }
  if (/^\d+(?:\.\d+)?$/.test(value)) {
    return resolveSpacingValue(value, false, theme);
  }
  return resolveThemeToken(theme, `--leading-${value}`);
}
