import { compareReusableGroups } from './compare-reusable-groups';
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

/**
 * Groups atoms that occur in exactly the same static composition entries.
 *
 * @param compositions Atomic classes for every static style entry.
 * @returns Reusable groups ordered deterministically by their score policy.
 */
export function reusableGroups(compositions: readonly (readonly string[])[]): readonly ReusableGroup[] {
  const usageByAtom = new Map<string, number[]>();
  for (let compositionIndex = 0; compositionIndex < compositions.length; compositionIndex++) {
    for (const atomicClass of compositions[compositionIndex]!) {
      const indexes = usageByAtom.get(atomicClass) ?? [];
      indexes.push(compositionIndex);
      usageByAtom.set(atomicClass, indexes);
    }
  }
  const atomsByUsage = new Map<string, { readonly atomicClasses: string[]; readonly compositionIndexes: number[] }>();
  for (const [atomicClass, compositionIndexes] of usageByAtom) {
    if (compositionIndexes.length < 2) {
      continue;
    }
    const key = compositionIndexes.join(',');
    const group = atomsByUsage.get(key) ?? { atomicClasses: [], compositionIndexes };
    group.atomicClasses.push(atomicClass);
    atomsByUsage.set(key, group);
  }
  return [...atomsByUsage.values()]
    .map(({ atomicClasses, compositionIndexes }) => reusableGroup(atomicClasses, compositionIndexes))
    .sort(compareReusableGroups);
}
