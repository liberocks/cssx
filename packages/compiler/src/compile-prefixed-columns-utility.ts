import { resolveArbitraryCssValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles a `columns-*` layout utility.
 *
 * @param utility Utility candidate without variants.
 * @returns Columns declaration, or null when the candidate is outside this family.
 */
export function compilePrefixedColumnsUtility(utility: string): UtilityDeclaration | null {
  const columns = /^columns-(auto|\d+|\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (!columns) {
    return null;
  }
  const value = columns[1]!;
  return {
    property: 'columns',
    value: value.startsWith('[') || value.startsWith('(') ? resolveArbitraryCssValue(value) : value,
  };
}
