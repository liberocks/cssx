import type { FileState } from './plugin-types';

/** Records a candidate's first zero-based source location. */
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
