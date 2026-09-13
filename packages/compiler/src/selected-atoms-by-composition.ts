import type { ReusableGroup } from './reusability';

/**
 * Records the atoms covered by selected reusable groups for every composition.
 *
 * @param compositions Canonical atom lists that define the composition count.
 * @param groups Reusable groups selected for factoring.
 * @returns One set of selected atoms for each composition index.
 */
export function selectedAtomsByComposition(
  compositions: readonly (readonly string[])[],
  groups: readonly ReusableGroup[],
): readonly ReadonlySet<string>[] {
  const atomsByComposition: Set<string>[] = [];
  for (let index = 0; index < compositions.length; index++) {
    atomsByComposition.push(new Set<string>());
  }
  for (const group of groups) {
    for (const compositionIndex of group.compositionIndexes) {
      const selectedAtoms = atomsByComposition[compositionIndex];
      for (const atomicClass of group.atomicClasses) {
        selectedAtoms!.add(atomicClass);
      }
    }
  }
  return atomsByComposition;
}
