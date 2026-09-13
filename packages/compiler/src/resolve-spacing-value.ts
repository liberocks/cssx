import { resolveThemeToken } from './theme';
import type { CssxTheme } from './theme';

/**
 * Resolves a spacing utility value.
 *
 * @param raw Utility value.
 * @param negative Whether the value is negated.
 * @param theme Active CSSX theme.
 * @returns CSS spacing value, or null when unsupported.
 */
export function resolveSpacingValue(raw: string, negative: boolean, theme: CssxTheme): string | null {
  const sign = negative ? '-' : '';
  if (raw === 'px') {
    return `${sign}1px`;
  }
  if (raw === 'full') {
    return `${sign}100%`;
  }
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return `${sign}${raw.slice(1, -1)}`;
  }
  if (!/^\d+(?:\.\d+)?$/.test(raw)) {
    return null;
  }
  const spacing = resolveThemeToken(theme, '--spacing');
  return spacing ? (negative ? `calc(${spacing} * -${raw})` : `calc(${spacing} * ${raw})`) : null;
}
