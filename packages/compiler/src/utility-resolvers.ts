import type { CssxTheme } from './theme';
import { resolveSpacingValue } from './resolve-spacing-value';
export { isLengthCssValue } from './is-length-css-value';
export { resolveArbitraryCssValue } from './resolve-arbitrary-css-value';
export { resolveBorderWidthValue } from './resolve-border-width-value';
export { flexValue } from './flex-value';
export { isBackgroundImageValue } from './is-background-image-value';
export { isLengthArbitraryValue } from './is-length-arbitrary-value';
export { resolveColorValue } from './resolve-color-value';
export { resolveOpacityModifier } from './resolve-opacity-modifier';
export { resolveSpacingValue } from './resolve-spacing-value';
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

/**
 * Splits a color value from a top-level opacity modifier.
 *
 * @param value Color utility value.
 * @returns Color value and optional opacity text.
 */
export function splitColorModifier(value: string): { readonly value: string; readonly opacity?: string } {
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote = '';
  let escaped = false;
  for (let index = 0; index < value.length; index++) {
    const character = value[index]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) {
        quote = '';
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '[') {
      bracketDepth++;
    }
    if (character === ']') {
      bracketDepth--;
    }
    if (character === '(') {
      parenthesisDepth++;
    }
    if (character === ')') {
      parenthesisDepth--;
    }
    if (character === '/' && bracketDepth === 0 && parenthesisDepth === 0) {
      return { value: value.slice(0, index), opacity: value.slice(index + 1) };
    }
  }
  return { value };
}
