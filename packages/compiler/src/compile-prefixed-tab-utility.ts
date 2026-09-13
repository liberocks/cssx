import { resolveArbitraryCssValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

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
