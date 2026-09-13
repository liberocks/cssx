import { UTILITY_FALLBACKS } from './fallback.generated';

/**
 * Checked-in CSS semantics for candidates that do not have a hand-written
 * CSSX recipe yet. The generator is development-only and is not loaded at runtime.
 */
export interface UtilityFallback {
  /** CSS associated with the source candidate selector. */
  readonly css: string;
  /** Coarse write group used by CSSX's static composition records. */
  readonly group: string;
}

/**
 * Looks up the immutable pinned fallback for one complete candidate.
 *
 * @param candidate Complete utility candidate without variants.
 * @returns The pinned fallback, or undefined when none is pinned.
 */
export function utilityFallback(candidate: string): UtilityFallback | undefined {
  return UTILITY_FALLBACKS[candidate];
}
