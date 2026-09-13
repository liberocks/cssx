import type { UtilityDeclaration } from './utility-types';

/** Fixed mask utilities that do not require value resolution. */
const EXACT_MASK_DECLARATIONS: Readonly<Record<string, readonly [property: string, value: string]>> = {
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

/**
 * Resolves one fixed mask utility.
 *
 * @param utility Utility name without variants.
 * @returns Its declaration, or null when it is not a fixed mask utility.
 */
export function compileExactMaskUtility(utility: string): UtilityDeclaration | null {
  const declaration = EXACT_MASK_DECLARATIONS[utility];
  return declaration ? { property: declaration[0], value: declaration[1] } : null;
}
