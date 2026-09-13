import { resolveArbitraryCssValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

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
