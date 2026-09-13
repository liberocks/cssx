import type { CssxTheme } from './theme';
import { isLengthCssValue, resolveArbitraryCssValue, resolveSpacingValue } from './utility-resolvers';

/**
 * Resolves mask-stop positions from spacing and percentage forms.
 *
 * @param raw Position segment from the utility name.
 * @param theme Active resolved theme.
 * @returns Resolved mask position, or null when unsupported.
 */
export function resolveMaskPosition(raw: string, theme: CssxTheme): string | null {
  if (/^\d+(?:\.\d+)?%$/.test(raw)) {
    return raw;
  }
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const value = resolveArbitraryCssValue(raw);
    if (!isLengthCssValue(value)) {
      return null;
    }
    return value.replace(/^(?:length|size):/, '');
  }
  return resolveSpacingValue(raw, false, theme);
}
