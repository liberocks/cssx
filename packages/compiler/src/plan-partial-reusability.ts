import type { ClassNameAllocator } from './class-name';
import { compositeIdentity } from './composite-identity';
import { compositeNameIdentity } from './composite-name-identity';
import { factorReusableGroups } from './factor-reusable-groups';
import type { ReusabilityPlan, ReusableFragment } from './reusability';
import { reusableGroups } from './reusable-groups';
import { selectReusableGroups } from './select-reusable-groups';

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
  const groups = factorReusableGroups(reusableGroups(canonicalCompositions));
  const selectedGroups = selectReusableGroups(
    groups,
    canonicalCompositions.reduce((total, atomicClasses) => total + atomicClasses.length, 0),
    budget,
  );
  const atomsByComposition = canonicalCompositions.map(() => new Set<string>());
  for (const group of selectedGroups) {
    for (const compositionIndex of group.compositionIndexes) {
      const selectedAtoms = atomsByComposition[compositionIndex];
      for (const atomicClass of group.atomicClasses) {
        selectedAtoms!.add(atomicClass);
      }
    }
  }

  const fragmentIdentities = selectedGroups.map((group) =>
    compositeNameIdentity(compositeIdentity(group.atomicClasses)),
  );
  const fragmentNames = allocator.allocate(fragmentIdentities);
  const fragmentsByComposition = new Map<string, ReusableFragment[]>();
  const classNames = new Map<string, string>();
  const residualIdentities = new Set<string>();
  const fragmentsForIndex = canonicalCompositions.map(() => [] as ReusableFragment[]);

  for (const group of selectedGroups) {
    const identity = compositeIdentity(group.atomicClasses);
    const className = fragmentNames.get(compositeNameIdentity(identity))!;
    const fragment = { className, atomicClasses: group.atomicClasses };
    for (const compositionIndex of group.compositionIndexes) {
      fragmentsForIndex[compositionIndex]!.push(fragment);
    }
  }
  for (let index = 0; index < canonicalCompositions.length; index++) {
    const residualAtoms = canonicalCompositions[index]!.filter(
      (atomicClass) => !atomsByComposition[index]!.has(atomicClass),
    );
    const residualIdentity = compositeIdentity(residualAtoms);
    if (residualIdentity) {
      residualIdentities.add(compositeNameIdentity(residualIdentity));
    }
  }
  const residualNames = allocator.allocate([...residualIdentities]);

  for (let index = 0; index < identities.length; index++) {
    const identity = identities[index]!;
    if (!identity || classNames.has(identity)) {
      continue;
    }
    const fragments = fragmentsForIndex[index]!;
    const residualAtoms = canonicalCompositions[index]!.filter(
      (atomicClass) => !atomsByComposition[index]!.has(atomicClass),
    );
    const residualIdentity = compositeIdentity(residualAtoms);
    const residualClassName = residualIdentity ? residualNames.get(compositeNameIdentity(residualIdentity))! : '';
    const className = [...fragments.map((fragment) => fragment.className), residualClassName].filter(Boolean).join(' ');
    classNames.set(identity, className);
    fragmentsByComposition.set(identity, [
      ...fragments,
      ...(residualClassName ? [{ className: residualClassName, atomicClasses: residualAtoms }] : []),
    ]);
  }
  return { classNames, fragments: fragmentsByComposition };
}
