import type { CssxTheme } from './theme';
import { resolveArbitraryCssValue, resolveColorValue, resolveSpacingValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles text decoration offset, thickness, style, and color utilities.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Decoration declaration, or null when unsupported.
 */
export function compileTextDecorationUtility(utility: string, theme: CssxTheme): UtilityDeclaration | null {
  const offset = /^underline-offset-(auto|\d+|\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (offset) {
    const raw = offset[1]!;
    const value =
      raw === 'auto'
        ? raw
        : raw.startsWith('(')
          ? resolveArbitraryCssValue(raw)
          : resolveSpacingValue(raw, false, theme);
    return {
      property: 'text-underline-offset',
      value: value ?? resolveArbitraryCssValue(raw),
    };
  }
  const decoration = /^decoration-(.+)$/.exec(utility);
  if (!decoration) {
    return null;
  }
  const raw = decoration[1]!;
  if (/^(solid|double|dotted|dashed|wavy)$/.test(raw)) {
    return { property: 'text-decoration-style', value: raw };
  }
  if (/^(auto|from-font|\d+)$/.test(raw)) {
    return { property: 'text-decoration-thickness', value: raw === 'auto' || raw === 'from-font' ? raw : `${raw}px` };
  }
  if (raw.startsWith('[') || raw.startsWith('(')) {
    return { property: 'text-decoration-thickness', value: resolveArbitraryCssValue(raw) };
  }
  const color = resolveColorValue(raw, theme);
  return color ? { property: 'text-decoration-color', value: color } : null;
}
