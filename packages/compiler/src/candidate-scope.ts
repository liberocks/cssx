import type { ParsedCandidate } from './candidate';

/**
 * Gets the merge scope shared by candidates with the same variants and importance.
 *
 * @param candidate Parsed candidate.
 * @returns Stable scope key for semantic conflict handling.
 */
export function candidateScope(candidate: ParsedCandidate): string {
  const scope = candidate.variants.join(':');
  return candidate.important ? (scope ? `${scope}!` : '!') : scope;
}
