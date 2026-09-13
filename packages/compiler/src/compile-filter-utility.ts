import { compileFilterFamily } from './compile-filter-family';
import { CSSX_FILTER_SINK } from './utility-effect-sinks';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles standard filter utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @returns Filter declarations, or null when unsupported.
 */
export function compileFilterUtility(utility: string, negative: boolean): UtilityDeclaration[] | null {
  return compileFilterFamily(utility, negative, 'filter', '--cssx-filter-', '', CSSX_FILTER_SINK, false);
}
