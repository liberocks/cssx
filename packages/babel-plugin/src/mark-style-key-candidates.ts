import type { FileState } from './plugin-types';

/** Marks candidates for one known style key as reachable. */
export function markStyleKeyCandidates(
  state: FileState,
  candidatesByKey: Readonly<Record<string, readonly string[]>>,
  key: string,
): void {
  for (const candidate of candidatesByKey[key] ?? []) {
    state.liveCandidates.add(candidate);
  }
}
