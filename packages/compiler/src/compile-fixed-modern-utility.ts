import { FIXED_MODERN_UTILITY_VALUES } from './fixed-modern-utility-values';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves exact-name modern CSS utility declarations.
 *
 * @param utility Utility name without variants.
 * @returns The fixed declaration, or null when the utility is not in the table.
 */
export function compileFixedModernUtility(utility: string): UtilityDeclaration | null {
  const fixed = FIXED_MODERN_UTILITY_VALUES[utility];
  return fixed ? { property: fixed[0], value: fixed[1] } : null;
}
