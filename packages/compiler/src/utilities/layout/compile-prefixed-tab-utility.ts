import type { UtilityDeclaration } from '../registry/utility-types';
import { resolveArbitraryCssValue } from '../values/utility-resolvers';

/**
 * Compiles a `tab-*` size utility.
 *
 * @param utility Utility candidate without variants.
 * @returns Tab-size declaration, or null when the candidate is outside this family.
 */
export function compilePrefixedTabUtility(utility: string): UtilityDeclaration | null {
  const tabSize = /^tab-(\d+|\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (!tabSize) {
    return null;
  }
  const value = tabSize[1]!;
  return {
    property: 'tab-size',
    value: value.startsWith('[') || value.startsWith('(') ? resolveArbitraryCssValue(value) : value,
  };
}
