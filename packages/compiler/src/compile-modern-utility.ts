import { resolveIntrinsicSize } from './resolve-intrinsic-size';
import { resolveNumericSvgValue } from './resolve-numeric-svg-value';
import type { CssxTheme } from './theme';
import { resolveArbitraryCssValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/** Fixed modern utility declarations keyed by complete utility name. */
const FIXED_VALUES: Readonly<Record<string, readonly [property: string, value: string]>> = {
  'content-visibility-visible': ['content-visibility', 'visible'],
  'content-visibility-auto': ['content-visibility', 'auto'],
  'content-visibility-hidden': ['content-visibility', 'hidden'],
  'contain-none': ['contain', 'none'],
  'contain-content': ['contain', 'content'],
  'contain-strict': ['contain', 'strict'],
  'contain-size': ['contain', 'size'],
  'contain-inline-size': ['contain', 'inline-size'],
  'contain-layout': ['contain', 'layout'],
  'contain-style': ['contain', 'style'],
  'contain-paint': ['contain', 'paint'],
  'stroke-cap-butt': ['stroke-linecap', 'butt'],
  'stroke-cap-round': ['stroke-linecap', 'round'],
  'stroke-cap-square': ['stroke-linecap', 'square'],
  'stroke-join-miter': ['stroke-linejoin', 'miter'],
  'stroke-join-round': ['stroke-linejoin', 'round'],
  'stroke-join-bevel': ['stroke-linejoin', 'bevel'],
  'fill-rule-nonzero': ['fill-rule', 'nonzero'],
  'fill-rule-evenodd': ['fill-rule', 'evenodd'],
  'clip-rule-nonzero': ['clip-rule', 'nonzero'],
  'clip-rule-evenodd': ['clip-rule', 'evenodd'],
  'vector-effect-none': ['vector-effect', 'none'],
  'vector-effect-non-scaling-stroke': ['vector-effect', 'non-scaling-stroke'],
  'paint-order-normal': ['paint-order', 'normal'],
  'paint-order-fill': ['paint-order', 'fill'],
  'paint-order-stroke': ['paint-order', 'stroke'],
  'paint-order-markers': ['paint-order', 'markers'],
  'shape-rendering-auto': ['shape-rendering', 'auto'],
  'shape-rendering-optimize-speed': ['shape-rendering', 'optimizeSpeed'],
  'shape-rendering-crisp-edges': ['shape-rendering', 'crispEdges'],
  'shape-rendering-geometric-precision': ['shape-rendering', 'geometricPrecision'],
  'writing-horizontal-tb': ['writing-mode', 'horizontal-tb'],
  'writing-vertical-rl': ['writing-mode', 'vertical-rl'],
  'writing-vertical-lr': ['writing-mode', 'vertical-lr'],
  'text-orientation-mixed': ['text-orientation', 'mixed'],
  'text-orientation-upright': ['text-orientation', 'upright'],
  'text-orientation-sideways': ['text-orientation', 'sideways'],
  'text-combine-upright-none': ['text-combine-upright', 'none'],
  'text-combine-upright-all': ['text-combine-upright', 'all'],
  'unicode-bidi-normal': ['unicode-bidi', 'normal'],
  'unicode-bidi-embed': ['unicode-bidi', 'embed'],
  'unicode-bidi-isolate': ['unicode-bidi', 'isolate'],
  'unicode-bidi-bidi-override': ['unicode-bidi', 'bidi-override'],
  'unicode-bidi-isolate-override': ['unicode-bidi', 'isolate-override'],
  'unicode-bidi-plaintext': ['unicode-bidi', 'plaintext'],
  'image-render-auto': ['image-rendering', 'auto'],
  'image-render-crisp-edges': ['image-rendering', 'crisp-edges'],
  'image-render-pixelated': ['image-rendering', 'pixelated'],
  'font-optical-auto': ['font-optical-sizing', 'auto'],
  'font-optical-none': ['font-optical-sizing', 'none'],
  'font-kerning-auto': ['font-kerning', 'auto'],
  'font-kerning-normal': ['font-kerning', 'normal'],
  'font-kerning-none': ['font-kerning', 'none'],
  'font-synthesis-none': ['font-synthesis', 'none'],
  'font-synthesis-weight': ['font-synthesis', 'weight'],
  'font-synthesis-style': ['font-synthesis', 'style'],
  'font-synthesis-small-caps': ['font-synthesis', 'small-caps'],
  'font-synthesis-position': ['font-synthesis', 'position'],
};

/**
 * Compiles newer platform utility families and fixed declarations.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Declaration, or null when unsupported.
 */
export function compileModernUtility(utility: string, theme: CssxTheme): UtilityDeclaration | null {
  const fixed = FIXED_VALUES[utility];
  if (fixed) {
    return { property: fixed[0], value: fixed[1] };
  }

  const contain = /^contain-\[(.+)\]$/.exec(utility);
  if (contain) {
    return { property: 'contain', value: resolveArbitraryCssValue(`[${contain[1]!}]`) };
  }

  const intrinsic = /^contain-intrinsic-(size|inline-size|block-size)-(.+)$/.exec(utility);
  if (intrinsic) {
    const suffix = intrinsic[1]!;
    const raw = intrinsic[2]!;
    const property = `contain-intrinsic-${suffix}`;
    const value = resolveIntrinsicSize(raw, property, theme);
    return value ? { property, value } : null;
  }

  const svgNumeric = /^stroke-(miterlimit|dasharray|dashoffset)-(.+)$/.exec(utility);
  if (svgNumeric) {
    const property = `stroke-${svgNumeric[1]!}`;
    const raw = svgNumeric[2]!;
    const value = resolveNumericSvgValue(raw);
    return value ? { property, value } : null;
  }
  return null;
}
