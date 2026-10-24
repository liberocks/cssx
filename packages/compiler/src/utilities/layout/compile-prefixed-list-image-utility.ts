import type { UtilityDeclaration } from '../registry/utility-types';
import { resolveArbitraryCssValue } from '../values/utility-resolvers';

/**
 * Compiles a `list-image-*` utility.
 *
 * @param utility Utility candidate without variants.
 * @returns List-style-image declaration, or null when the candidate is outside this family.
 */
export function compilePrefixedListImageUtility(utility: string): UtilityDeclaration | null {
  const listImage = /^list-image-(\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  return listImage ? { property: 'list-style-image', value: resolveArbitraryCssValue(listImage[1]!) } : null;
}
