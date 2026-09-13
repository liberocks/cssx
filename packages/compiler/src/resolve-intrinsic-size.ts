import { resolveNamedValue } from './resolve-named-value';
import type { CssxTheme } from './theme';
import { resolveSpacingValue } from './utility-resolvers';

/**
 * Resolves an intrinsic-size utility value.
 *
 * @param raw Utility value.
 * @param property CSS property used to derive the theme token.
 * @param theme Active resolved theme.
 * @returns CSS size, or null when unknown.
 */
export function resolveIntrinsicSize(raw: string, property: string, theme: CssxTheme): string | null {
  if (raw === 'none') {
    return 'none';
  }
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    return resolveSpacingValue(raw, false, theme);
  }
  return resolveNamedValue(raw, `--${property}-${raw}`, theme);
}
