import type { ClassNameAllocator } from './class-name';
import { compositeIdentity } from './composite-identity';
import { compositeNameIdentity } from './composite-name-identity';
import { createPartialReusabilityPlan } from './create-partial-reusability-plan';
import { factorReusableGroups } from './factor-reusable-groups';
import { residualAtomicClassesByComposition } from './residual-atomic-classes-by-composition';
import { residualCompositionIdentities } from './residual-composition-identities';
import type { ReusabilityPlan } from './reusability';
import { reusableFragmentsByComposition } from './reusable-fragments-by-composition';
import { reusableGroups } from './reusable-groups';
import { selectReusableGroups } from './select-reusable-groups';
import { selectedAtomsByComposition } from './selected-atoms-by-composition';

/**
 * Builds reusable aliases and residual classes for an intermediate budget.
 *
 * @param canonicalCompositions Sorted, deduplicated atomic classes per style.
 * @param identities Stable composition identities aligned with the styles.
 * @param budget Normalized budget strictly between zero and one hundred or `'auto'`.
 * @param allocator Allocator used to name fragments and residual classes.
 * @returns Final class strings and their reusable fragments.
 */
export function planPartialReusability(
  canonicalCompositions: readonly (readonly string[])[],
  identities: readonly string[],
  budget: number | 'auto',
  allocator: ClassNameAllocator,
): ReusabilityPlan {
  let totalAtomOccurrences = 0;
  for (const atomicClasses of canonicalCompositions) {
    totalAtomOccurrences += atomicClasses.length;
  }
  const groups = factorReusableGroups(reusableGroups(canonicalCompositions));
  const selectedGroups = selectReusableGroups(groups, totalAtomOccurrences, budget);
  const fragmentIdentities: string[] = [];
  for (const group of selectedGroups) {
    fragmentIdentities.push(compositeNameIdentity(compositeIdentity(group.atomicClasses)));
  }
  const fragmentNames = allocator.allocate(fragmentIdentities);
  const selectedAtoms = selectedAtomsByComposition(canonicalCompositions, selectedGroups);
  const reusableFragments = reusableFragmentsByComposition(canonicalCompositions.length, selectedGroups, fragmentNames);
  const residualAtoms = residualAtomicClassesByComposition(canonicalCompositions, selectedAtoms);
  const residualNames = allocator.allocate(residualCompositionIdentities(residualAtoms));
  return createPartialReusabilityPlan(identities, reusableFragments, residualAtoms, residualNames);
}
