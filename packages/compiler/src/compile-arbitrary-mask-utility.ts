import { resolveArbitraryCssValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves arbitrary image, position, and size mask utilities.
 *
 * @param utility Utility name without variants.
 * @returns Its declaration, or null when it is not an arbitrary mask utility.
 */
export function compileArbitraryMaskUtility(utility: string): UtilityDeclaration | null {
  const placement = /^mask-(position|size)-(.+)$/.exec(utility);
  if (placement) {
    return { property: `mask-${placement[1]!}`, value: resolveArbitraryCssValue(placement[2]!) };
  }
  const image = /^mask-(\[.+\]|\(.+\))$/.exec(utility);
  if (image) {
    return { property: 'mask-image', value: resolveArbitraryCssValue(image[1]!) };
  }
  return null;
}
