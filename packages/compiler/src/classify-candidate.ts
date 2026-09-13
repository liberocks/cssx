import { parseCandidate } from './candidate';
import { classifyParsedCandidate } from './classify-parsed-candidate';
import type { UtilitySemantics } from './utility-semantics';

/**
 * Maps a static utility string to CSSX-owned semantic write domains.
 *
 * @param candidateSource Static utility string to classify.
 * @returns Semantic write data, or null when CSSX does not support the utility.
 */
export function classifyCandidate(candidateSource: string): UtilitySemantics | null {
  return classifyParsedCandidate(parseCandidate(candidateSource));
}
