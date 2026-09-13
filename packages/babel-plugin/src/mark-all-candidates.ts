import type { FileState } from './plugin-types';

/** Marks every candidate in a style map as reachable. */
export function markAllCandidates(
  state: FileState,
  candidatesByKey: Readonly<Record<string, readonly string[]>>,
): void {
  for (const candidates of Object.values(candidatesByKey)) {
    for (const candidate of candidates) {
      state.liveCandidates.add(candidate);
    }
  }
}
