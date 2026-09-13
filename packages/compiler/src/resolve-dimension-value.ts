import { resolveSpacingValue } from './resolve-spacing-value';
import type { CssxTheme } from './theme';

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
    return namedMaxWidths[raw]!;
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
    const value = values[raw]!;
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
