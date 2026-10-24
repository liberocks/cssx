import type { UtilityDeclaration } from '../registry/utility-types';
import { resolveArbitraryCssValue } from '../values/utility-resolvers';
import { cloneDeclarations } from '../values/utility-values';
import { BACKGROUND_UTILITY_DECLARATIONS } from './background-utility-declarations';

/**
 * Compiles fixed and arbitrary background utilities.
 *
 * @param utility Utility name without variants.
 * @returns Background declarations, or null when unsupported.
 */
export function compileBackgroundUtility(utility: string): UtilityDeclaration | UtilityDeclaration[] | null {
  const direct = BACKGROUND_UTILITY_DECLARATIONS[utility];
  if (direct) {
    if (Array.isArray(direct)) {
      return cloneDeclarations(direct);
    }
    return direct;
  }
  const position = /^bg-position-(\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (position) {
    return { property: 'background-position', value: resolveArbitraryCssValue(position[1]!) };
  }
  const size = /^bg-size-(\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  return size ? { property: 'background-size', value: resolveArbitraryCssValue(size[1]!) } : null;
}
