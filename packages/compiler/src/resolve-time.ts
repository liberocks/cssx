import { arbitraryValue } from './arbitrary-value';
import { resolveThemeToken } from './theme';
import type { CssxTheme } from './theme';

/**
 * Resolves a numeric, arbitrary, variable, or theme-backed time value.
 *
 * @param raw Time segment from the utility name.
 * @param tokenPrefix Theme namespace for named time tokens.
 * @param theme Active resolved theme.
 * @returns Resolved CSS time, or null when unsupported.
 */
export function resolveTime(raw: string, tokenPrefix: string, theme: CssxTheme): string | null {
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    return `${raw}ms`;
  }
  const arbitrary = arbitraryValue(raw);
  return arbitrary ?? resolveThemeToken(theme, `${tokenPrefix}${raw}`) ?? null;
}
