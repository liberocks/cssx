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

/**
 * Validates and normalizes an opacity percentage.
 *
 * @param value Opacity utility value.
 * @returns Percentage text, or null when invalid.
 */
export function resolveOpacityModifier(value: string): string | null {
  const raw = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value;
  if (!/^\d+(?:\.\d+)?$/.test(raw)) {
    return null;
  }
  const opacity = Number(raw);
  if (opacity < 0 || opacity > 100) {
    return null;
  }
  return String(opacity);
}

/**
 * Checks whether arbitrary text is a supported length expression.
 *
 * @param value Arbitrary value without brackets.
 * @returns Whether the value is a length.
 */
export function isLengthArbitraryValue(value: string): boolean {
  const normalized = value.replace(/^(?:length|size):/, '');
  return (
    /^-?(?:\d+(?:\.\d+)?)(?:px|rem|em|ch|ex|vw|vh|vmin|vmax|%|cm|mm|in|pt|pc)$/i.test(normalized) ||
    normalized.startsWith('calc(')
  );
}

/**
 * Checks whether arbitrary text is a supported background image.
 *
 * @param value Arbitrary value without brackets.
 * @returns Whether the value is an image expression.
 */
export function isBackgroundImageValue(value: string): boolean {
  return (
    value.startsWith('image:') || /^(?:url|linear-gradient|radial-gradient|conic-gradient|image-set)\(/.test(value)
  );
}
