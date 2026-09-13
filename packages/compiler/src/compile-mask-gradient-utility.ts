import { maskGradientSink } from './mask-gradient-sink';
import { resolveMaskColor } from './resolve-mask-color';
import { resolveMaskPosition } from './resolve-mask-position';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles gradient stops and angle utilities used by CSS masks.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Gradient declarations, or null when the utility is unsupported.
 */
export function compileMaskGradientUtility(utility: string, theme: CssxTheme): UtilityDeclaration[] | null {
  const gradient = /^mask-(x|y|t|r|b|l|linear|radial|conic)-(from|to)-(.+)$/.exec(utility);
  if (gradient) {
    const family = gradient[1]!;
    const stop = gradient[2]!;
    const raw = gradient[3]!;
    const position = resolveMaskPosition(raw, theme);
    const color = resolveMaskColor(raw, theme);
    if (!position && !color) {
      return null;
    }
    const semanticGroup = `mask-${family}-${stop}`;
    return [
      {
        property: `--cssx-mask-${family}-${stop}-${position ? 'position' : 'color'}`,
        value: position ?? color!,
        semanticGroup,
      },
      ...maskGradientSink(family, semanticGroup),
    ];
  }
  const angle = /^mask-(linear|conic)-(\d+)$/.exec(utility);
  if (angle) {
    const family = angle[1]!;
    const semanticGroup = `mask-${family}-angle`;
    return [
      { property: `--cssx-mask-${family}-angle`, value: `${angle[2]}deg`, semanticGroup },
      ...maskGradientSink(family, semanticGroup),
    ];
  }
  return null;
}
