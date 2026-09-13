import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves overflow and overscroll behavior utilities.
 *
 * @param utility Utility name without variants.
 * @returns The corresponding declaration, or null when unsupported.
 */
export function compileOverflowUtility(utility: string): UtilityDeclaration | null {
  const overflow = /^(overflow|overflow-x|overflow-y)-(auto|hidden|clip|visible|scroll)$/.exec(utility);
  if (overflow) {
    return { property: overflow[1]!, value: overflow[2]! };
  }
  const overscroll = /^(overscroll|overscroll-x|overscroll-y)-(auto|contain|none)$/.exec(utility);
  if (!overscroll) {
    return null;
  }
  const property =
    overscroll[1] === 'overscroll'
      ? 'overscroll-behavior'
      : `overscroll-behavior-${overscroll[1] === 'overscroll-x' ? 'x' : 'y'}`;
  return { property, value: overscroll[2]! };
}
