import { classifyCandidate } from './semantics';
import type { UtilityConflictRecord } from './utility-conflict-record';

/**
 * Finds the style groups used by one static utility.
 *
 * @param candidate A static utility string.
 * @returns Its style groups, or null when CSSX does not support it.
 */
export function classifyUtility(candidate: string): UtilityConflictRecord | null {
  const semantics = classifyCandidate(candidate);
  if (!semantics) {
    return null;
  }
  return semantics;
}
