import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';
import { cloneDeclarations } from './utility-values';
import {
  isLengthCssValue,
  resolveArbitraryCssValue,
  resolveColorValue,
  resolveOpacityModifier,
  resolveSpacingValue,
  splitColorModifier,
} from './utility-resolvers';

/** Combined numeric font-variant value fed by independent utility channels. */
const CSSX_NUMERIC_SINK =
  'var(--cssx-numeric-ordinal,) var(--cssx-numeric-slashed-zero,) var(--cssx-numeric-lining-nums,) var(--cssx-numeric-oldstyle-nums,) var(--cssx-numeric-proportional-nums,) var(--cssx-numeric-tabular-nums,) var(--cssx-numeric-diagonal-fractions,) var(--cssx-numeric-stacked-fractions,)';

/**
 * Compiles composable numeric font-variant utilities.
 *
 * @param utility Utility name without variants.
 * @returns Numeric declarations, or null when unsupported.
 */
export function compileNumericUtility(utility: string): UtilityDeclaration[] | null {
  const values: Readonly<Record<string, string>> = {
    ordinal: 'ordinal',
    'slashed-zero': 'slashed-zero',
    'lining-nums': 'lining-nums',
    'oldstyle-nums': 'oldstyle-nums',
    'proportional-nums': 'proportional-nums',
    'tabular-nums': 'tabular-nums',
    'diagonal-fractions': 'diagonal-fractions',
    'stacked-fractions': 'stacked-fractions',
  };
  const channels = ['numeric-normal', ...Object.keys(values).map((value) => `numeric-${value}`)];
  if (utility === 'normal-nums') {
    return [
      {
        property: 'font-variant-numeric',
        value: 'normal',
        semanticGroup: 'numeric-normal',
        semanticConflicts: channels,
      },
    ];
  }
  const value = values[utility];
  if (!value) {
    return null;
  }
  const semanticGroup = `numeric-${utility}`;
  const semanticConflicts = [semanticGroup, 'numeric-normal'];
  return [
    { property: `--cssx-numeric-${utility}`, value, semanticGroup, semanticConflicts },
    { property: 'font-variant-numeric', value: CSSX_NUMERIC_SINK, semanticGroup, semanticConflicts },
  ];
}

/**
 * Compiles fixed and arbitrary background utilities.
 *
 * @param utility Utility name without variants.
 * @returns Background declarations, or null when unsupported.
 */
export function compileBackgroundUtility(utility: string): UtilityDeclaration | UtilityDeclaration[] | null {
  const exact: Readonly<Record<string, UtilityDeclaration | UtilityDeclaration[]>> = {
    'bg-none': { property: 'background-image', value: 'none' },
    'bg-auto': { property: 'background-size', value: 'auto' },
    'bg-cover': { property: 'background-size', value: 'cover' },
    'bg-contain': { property: 'background-size', value: 'contain' },
    'bg-top-left': { property: 'background-position', value: 'top left' },
    'bg-top': { property: 'background-position', value: 'top' },
    'bg-top-right': { property: 'background-position', value: 'top right' },
    'bg-left': { property: 'background-position', value: 'left' },
    'bg-center': { property: 'background-position', value: 'center' },
    'bg-right': { property: 'background-position', value: 'right' },
    'bg-bottom-left': { property: 'background-position', value: 'bottom left' },
    'bg-bottom': { property: 'background-position', value: 'bottom' },
    'bg-bottom-right': { property: 'background-position', value: 'bottom right' },
    'bg-repeat': { property: 'background-repeat', value: 'repeat' },
    'bg-no-repeat': { property: 'background-repeat', value: 'no-repeat' },
    'bg-repeat-x': { property: 'background-repeat', value: 'repeat-x' },
    'bg-repeat-y': { property: 'background-repeat', value: 'repeat-y' },
    'bg-repeat-round': { property: 'background-repeat', value: 'round' },
    'bg-repeat-space': { property: 'background-repeat', value: 'space' },
    'bg-fixed': { property: 'background-attachment', value: 'fixed' },
    'bg-local': { property: 'background-attachment', value: 'local' },
    'bg-scroll': { property: 'background-attachment', value: 'scroll' },
    'bg-clip-border': { property: 'background-clip', value: 'border-box' },
    'bg-clip-padding': { property: 'background-clip', value: 'padding-box' },
    'bg-clip-content': { property: 'background-clip', value: 'content-box' },
    'bg-clip-text': [
      { property: '-webkit-background-clip', value: 'text', semanticGroup: 'background-clip' },
      { property: 'background-clip', value: 'text', semanticGroup: 'background-clip' },
      { property: 'color', value: 'transparent', semanticGroup: 'background-clip' },
    ],
    'bg-origin-border': { property: 'background-origin', value: 'border-box' },
    'bg-origin-padding': { property: 'background-origin', value: 'padding-box' },
    'bg-origin-content': { property: 'background-origin', value: 'content-box' },
  };
  const direct = exact[utility];
  if (direct) {
    if (Array.isArray(direct)) {
      return cloneDeclarations(direct);
    }
    return direct;
  }
  const position = /^bg-position-(\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (position) {
    return { property: 'background-position', value: resolveArbitraryCssValue(position[1]!) };
  }
  const size = /^bg-size-(\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  return size ? { property: 'background-size', value: resolveArbitraryCssValue(size[1]!) } : null;
}

/**
 * Compiles fixed and arbitrary mask utilities.
 *
 * @param utility Utility name without variants.
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

/** Resolves Tailwind mask-stop positions from spacing and percentage forms. */
function resolveMaskPosition(raw: string, theme: CssxTheme): string | null {
  if (/^\d+(?:\.\d+)?%$/.test(raw)) {
    return raw;
  }
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const value = resolveArbitraryCssValue(raw);
    if (!isLengthCssValue(value)) {
      return null;
    }
    return value.replace(/^(?:length|size):/, '');
  }
  return resolveSpacingValue(raw, false, theme);
}

/** Resolves Tailwind mask-stop colors including slash-opacity modifiers. */
function resolveMaskColor(raw: string, theme: CssxTheme): string | null {
  const modifier = splitColorModifier(raw);
  const color = resolveColorValue(modifier.value, theme);
  if (!color) {
    return null;
  }
  if (modifier.opacity === undefined) {
    return color;
  }
  const opacity = resolveOpacityModifier(modifier.opacity);
  return opacity === null ? null : `color-mix(in srgb, ${color} ${opacity}%, transparent)`;
}

/** Builds a self-contained mask-gradient channel and image sink. */
function maskGradientSink(family: string, semanticGroup: string): UtilityDeclaration[] {
  const direction: Readonly<Record<string, string>> = {
    t: 'to top',
    r: 'to right',
    b: 'to bottom',
    l: 'to left',
    x: 'to right',
    y: 'to bottom',
  };
  const from = `var(--cssx-mask-${family}-from-color, black) var(--cssx-mask-${family}-from-position, 0%)`;
  const to = `var(--cssx-mask-${family}-to-color, transparent) var(--cssx-mask-${family}-to-position, 100%)`;
  const image =
    family === 'radial'
      ? `radial-gradient(${from}, ${to})`
      : family === 'conic'
        ? `conic-gradient(from var(--cssx-mask-conic-angle, 0deg), ${from}, ${to})`
        : `linear-gradient(${family === 'linear' ? 'var(--cssx-mask-linear-angle, 0deg)' : direction[family]!}, ${from}, ${to})`;
  return [
    { property: `--cssx-mask-${family}`, value: image, semanticGroup },
    { property: 'mask-image', value: `var(--cssx-mask-${family})`, semanticGroup },
  ];
}
