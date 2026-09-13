import type { CssxTheme } from './theme';
import { resolveArbitraryCssValue, resolveSpacingValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';
import { leadingValue, trackingValue } from './utility-values';

/**
 * Compiles typography-adjacent numeric, font, and spacing utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether spacing values are negated.
 * @param theme Active resolved theme.
 * @returns Typography declaration, or null when unsupported.
 */
export function compilePrefixedTypographyUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | null {
  const opacity = /^opacity-(\d{1,3})$/.exec(utility);
  if (opacity) {
    return { property: 'opacity', value: String(Number(opacity[1]) / 100) };
  }
  const zIndex = /^z-(\d+|auto)$/.exec(utility);
  if (zIndex) {
    return { property: 'z-index', value: zIndex[1]! };
  }
  const leading = /^leading-(none|tight|snug|normal|relaxed|loose|\d+(?:\.\d+)?|\[[^\]]+\])$/.exec(utility);
  if (leading) {
    const value = leading[1]!;
    const resolved = /^\d/.test(value) ? resolveSpacingValue(value, false, theme) : leadingValue(value);
    return resolved ? { property: 'line-height', value: resolved } : null;
  }
  const indent = /^indent-(.+)$/.exec(utility);
  if (indent) {
    const value = resolveSpacingValue(indent[1]!, negative, theme);
    return value ? { property: 'text-indent', value } : null;
  }
  const font = /^font-(\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (font) {
    return { property: 'font-family', value: resolveArbitraryCssValue(font[1]!) };
  }
  const tracking = /^tracking-(tighter|tight|normal|wide|wider|widest|\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (tracking) {
    const value = tracking[1]!;
    return {
      property: 'letter-spacing',
      value: value.startsWith('[') || value.startsWith('(') ? resolveArbitraryCssValue(value) : trackingValue(value),
    };
  }
  return null;
}
