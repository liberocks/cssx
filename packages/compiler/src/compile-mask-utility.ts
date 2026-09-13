import { maskGradientSink } from './mask-gradient-sink';
import { resolveMaskColor } from './resolve-mask-color';
import { resolveMaskPosition } from './resolve-mask-position';
import type { CssxTheme } from './theme';
import { resolveArbitraryCssValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles fixed and arbitrary mask utilities.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Mask declaration, or null when unsupported.
 */
export function compileMaskUtility(
  utility: string,
  theme: CssxTheme,
): UtilityDeclaration | UtilityDeclaration[] | null {
  const exact: Readonly<Record<string, readonly [property: string, value: string]>> = {
    'mask-none': ['mask-image', 'none'],
    'mask-cover': ['mask-size', 'cover'],
    'mask-contain': ['mask-size', 'contain'],
    'mask-repeat': ['mask-repeat', 'repeat'],
    'mask-no-repeat': ['mask-repeat', 'no-repeat'],
    'mask-repeat-x': ['mask-repeat', 'repeat-x'],
    'mask-repeat-y': ['mask-repeat', 'repeat-y'],
    'mask-repeat-round': ['mask-repeat', 'round'],
    'mask-repeat-space': ['mask-repeat', 'space'],
    'mask-clip-border': ['mask-clip', 'border-box'],
    'mask-clip-padding': ['mask-clip', 'padding-box'],
    'mask-clip-content': ['mask-clip', 'content-box'],
    'mask-no-clip': ['mask-clip', 'no-clip'],
    'mask-origin-border': ['mask-origin', 'border-box'],
    'mask-origin-padding': ['mask-origin', 'padding-box'],
    'mask-origin-content': ['mask-origin', 'content-box'],
    'mask-add': ['mask-composite', 'add'],
    'mask-subtract': ['mask-composite', 'subtract'],
    'mask-intersect': ['mask-composite', 'intersect'],
    'mask-exclude': ['mask-composite', 'exclude'],
    'mask-alpha': ['mask-mode', 'alpha'],
    'mask-luminance': ['mask-mode', 'luminance'],
    'mask-match': ['mask-mode', 'match-source'],
    'mask-type-alpha': ['mask-type', 'alpha'],
    'mask-type-luminance': ['mask-type', 'luminance'],
  };
  const declaration = exact[utility];
  if (declaration) {
    return { property: declaration[0], value: declaration[1] };
  }
  const match = /^mask-(position|size)-(.+)$/.exec(utility);
  if (match) {
    return { property: `mask-${match[1]!}`, value: resolveArbitraryCssValue(match[2]!) };
  }
  const image = /^mask-(\[.+\]|\(.+\))$/.exec(utility);
  if (image) {
    return { property: 'mask-image', value: resolveArbitraryCssValue(image[1]!) };
  }
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
