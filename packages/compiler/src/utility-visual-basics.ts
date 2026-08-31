import type { UtilityDeclaration } from './utility-types';
import { cloneDeclarations } from './utility-values';
import { resolveArbitraryCssValue } from './utility-resolvers';

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
export function compileMaskUtility(utility: string): UtilityDeclaration | null {
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
  return null;
}
