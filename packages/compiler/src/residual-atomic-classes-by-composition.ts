/**
 * Removes reusable atoms from each canonical composition.
 *
 * @param compositions Canonical atom lists for each style composition.
 * @param selectedAtoms Reusable atoms already represented by named fragments.
 * @returns Residual atoms that still need per-composition class names.
 */
export function residualAtomicClassesByComposition(
  compositions: readonly (readonly string[])[],
  selectedAtoms: readonly ReadonlySet<string>[],
): readonly (readonly string[])[] {
  const residualCompositions: string[][] = [];
  for (let index = 0; index < compositions.length; index++) {
    const residualAtoms: string[] = [];
    for (const atomicClass of compositions[index]!) {
      if (!selectedAtoms[index]!.has(atomicClass)) {
        residualAtoms.push(atomicClass);
      }
    }
    residualCompositions.push(residualAtoms);
  }
  return residualCompositions;
}
