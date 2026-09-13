import { CSSX_SHADOW_SINK } from './utility-effect-sinks';
import { resolveArbitraryCssValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

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
  return [
    { property: '--cssx-shadow', value: resolveArbitraryCssValue(match[1]!), semanticGroup: 'shadow' },
    { property: 'box-shadow', value: CSSX_SHADOW_SINK, semanticGroup: 'shadow' },
  ];
}
