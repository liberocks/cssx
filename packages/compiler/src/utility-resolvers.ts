import { resolveThemeToken } from './theme';
import type { CssxTheme } from './theme';

/**
 * Decodes bracketed or variable shorthand utility values.
 *
 * @param value Raw arbitrary utility value.
 * @returns CSS value with escaped underscores preserved.
 */
export function resolveArbitraryCssValue(value: string): string {
  if (value.startsWith('(') && value.endsWith(')')) {
    return `var(${value.slice(1, -1)})`;
  }
  const raw = value.slice(1, -1);
  return raw.replaceAll('\\_', '\u0000').replaceAll('_', ' ').replaceAll('\u0000', '_');
}
/**
 * Resolves a supported border-width value.
 *
 * @param raw Utility value.
 * @returns CSS width, or null when unsupported.
 */
export function resolveBorderWidthValue(raw: string): string | null {
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw.slice(1, -1);
  }
  return /^(0|2|4|8)$/.test(raw) ? `${raw}px`.replace('0px', '0') : null;
}
/**
 * Resolves a spacing value against the active spacing token.
 *
 * @param raw Utility value.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
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
  return spacing ? `${sign}calc(${spacing} * ${raw})` : null;
}

/**
 * Resolves an integer or fraction to a flex value.
 *
 * @param raw Utility value.
 * @returns CSS flex value, or null when unsupported.
 */
export function flexValue(raw: string): string | null {
  const fraction = /^(\d+)\/(\d+)$/.exec(raw);
  if (!fraction) {
    return /^\d+$/.test(raw) ? raw : null;
  }
  const denominator = Number(fraction[2]);
  if (denominator === 0) {
    return null;
  }
  return `calc(${fraction[1]} / ${fraction[2]} * 100%)`;
}

/**
 * Resolves named, fractional, viewport, and spacing dimension values.
 *
 * @param raw Utility value.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @param dimension Dimension family that affects named values.
 * @returns CSS dimension, or null when unsupported.
 */
export function resolveDimensionValue(
  raw: string,
  negative: boolean,
  theme: CssxTheme,
  dimension: string,
): string | null {
  const namedMaxWidths: Readonly<Record<string, string>> = {
    xs: '20rem',
    sm: '24rem',
    md: '28rem',
    lg: '32rem',
    xl: '36rem',
    '2xl': '42rem',
    '3xl': '48rem',
    '4xl': '56rem',
    '5xl': '64rem',
    '6xl': '72rem',
    '7xl': '80rem',
  };
  if ((dimension === 'max-w' || dimension === 'max-inline') && namedMaxWidths[raw]) {
    return namedMaxWidths[raw] ?? null;
  }
  if (raw === 'auto' || raw === 'full' || raw === 'screen') {
    const values: Readonly<Record<string, string>> = {
      auto: 'auto',
      full: '100%',
      screen: dimension.includes('block')
        ? '100vb'
        : dimension.includes('inline')
          ? '100vi'
          : dimension.includes('h')
            ? '100vh'
            : '100vw',
    };
    const value = values[raw] ?? null;
    return value && negative ? `-${value}` : value;
  }
  const fraction = /^(\d+)\/(\d+)$/.exec(raw);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    if (denominator === 0) {
      return null;
    }
    return `${negative ? '-' : ''}${(numerator / denominator) * 100}%`;
  }
  return resolveSpacingValue(raw, negative, theme);
}

/**
 * Resolves an arbitrary or theme-backed color.
 *
 * @param raw Utility color value.
 * @param theme Active resolved theme.
 * @returns CSS color, or null when no token exists.
 */
export function resolveColorValue(raw: string, theme: CssxTheme): string | null {
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw.slice(1, -1);
  }
  return resolveThemeToken(theme, `--color-${raw}`) ?? null;
