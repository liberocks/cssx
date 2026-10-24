import type { UtilityDeclaration } from '../registry/utility-types';
import { resolveArbitraryCssValue } from '../values/utility-resolvers';
import { createShadowDeclarations } from './create-shadow-declarations';

/**
 * Compiles arbitrary and custom-property box-shadow utilities.
 *
 * @param utility Utility name without variants.
 * @returns Shadow declarations, or null when unsupported.
 */
export function compileShadowUtility(utility: string): UtilityDeclaration[] | null {
  const match = /^shadow-(\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (!match) {
    return null;
  }
  return [...createShadowDeclarations(resolveArbitraryCssValue(match[1]!))];
}
