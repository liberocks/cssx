import { UTILITY_FALLBACKS } from './fallback.generated';

/**
 * Checked-in CSS semantics for candidates without a hand-written CSSX recipe.
 * The development-only generator is not loaded at runtime.
 */
export interface UtilityFallback {
  /** CSS associated with the source candidate selector. */
  readonly css: string;
  /** Coarse write group used by CSSX's static composition records. */
  readonly group: string;
}

/**
 * Looks up the checked-in utility record for one complete candidate.
 *
 * @param candidate Complete utility candidate without variants.
 * @returns The utility record, or undefined when no record exists.
 */
export function utilityFallback(candidate: string): UtilityFallback | undefined {
  return UTILITY_FALLBACKS[candidate];
}
