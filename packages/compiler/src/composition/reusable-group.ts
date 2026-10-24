import type { ReusableGroup } from './reusability';

/**
 * Creates derived statistics for one exact usage group.
 *
 * @param atomicClasses Atoms that always appear together.
 * @param compositionIndexes Style entries that contain these atoms.
 * @returns A reusable group with coverage and score statistics.
 */
export function reusableGroup(atomicClasses: readonly string[], compositionIndexes: readonly number[]): ReusableGroup {
  const coverage = atomicClasses.length * compositionIndexes.length;
  // A reusable group removes one alias from every matching atom rule while
  // adding one token to every matching static class string.
  const score = (compositionIndexes.length - 1) * atomicClasses.length - compositionIndexes.length;
  return { atomicClasses, compositionIndexes, coverage, score };
}
