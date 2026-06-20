import type { FileState } from './plugin-types';

/**
 * Records a candidate's first source location.
 *
 * Babel lines are one-based, so stored metadata lines are changed to zero-based.
 * Columns are already zero-based and are kept as-is.
 *
 * @param state Data collected for the current source module.
 * @param candidate Source candidate to locate.
 * @param location Babel start location for the candidate.
 * @param location.line One-based source line.
 * @param location.column Zero-based source column.
 * @returns Nothing. The existing origin remains when this candidate was already recorded.
 */
export function recordCandidateOrigin(
  state: FileState,
  candidate: string,
  location?: { readonly line: number; readonly column: number },
): void {
  if (!location || state.candidateOrigins.has(candidate)) {
    return;
  }
  state.candidateOrigins.set(candidate, { line: location.line - 1, column: location.column });
}

/**
 * Marks candidates for one known style key as reachable.
 *
 * @param state Data collected for the current source module.
 * @param candidatesByKey Candidates grouped by style key.
 * @param key Style key whose candidates should be kept.
 * @returns Nothing. An unknown key marks no candidates.
 */
export function markStyleKeyCandidates(
  state: FileState,
