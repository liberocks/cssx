import { resolveArbitraryCssValue } from './resolve-arbitrary-css-value';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves an arbitrary CSS containment utility.
 *
 * @param utility Utility name without variants.
 * @returns The contain declaration, or null when this is not an arbitrary contain utility.
 */
export function compileArbitraryContainUtility(utility: string): UtilityDeclaration | null {
  const contain = /^contain-\[(.+)\]$/.exec(utility);
  return contain ? { property: 'contain', value: resolveArbitraryCssValue(`[${contain[1]!}]`) } : null;
}
