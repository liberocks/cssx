import type { UtilityDeclaration } from '../registry/utility-types';
import { resolveArbitraryCssValue } from '../values/utility-resolvers';

/**
 * Compiles an `object-*` position utility.
 *
 * @param utility Utility candidate without variants.
 * @returns Object-position declaration, or null when the candidate is outside this family.
 */
export function compilePrefixedObjectUtility(utility: string): UtilityDeclaration | null {
  const object = /^object-(\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  return object ? { property: 'object-position', value: resolveArbitraryCssValue(object[1]!) } : null;
}
