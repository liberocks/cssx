import type { ClassNameAllocator } from './class-name';
import { compositeIdentity } from './composite-identity';
import { compositeNameIdentity } from './composite-name-identity';
import { createCompleteCompositionPlan } from './create-complete-composition-plan';
import { factorReusableGroups } from './factor-reusable-groups';
import { normalizeReusabilityBudget } from './normalize-reusability-budget';
import type { ReusabilityBudget, ReusabilityPlan, ReusableFragment } from './reusability';
import { reusableGroups } from './reusable-groups';
import { selectReusableGroups } from './select-reusable-groups';

/**
 * Selects reusable groups of winning atoms for static styles.
 *
 * At zero every style keeps its complete alias. At one hundred every winning
 * atom is emitted directly. Intermediate budgets select groups whose atoms
 * have the identical usage set, which keeps planning linear in atom usage and
 * avoids overlapping-set search.
 *
 * @param compositions Atomic classes for every static style entry.
 * @param budget Reusability coverage budget or `'auto'`.
 * @param allocator Allocator used to name fragments and residual classes.
 * @returns Final class strings and the alias fragments they reuse.
 */
export function planReusability(
  compositions: readonly (readonly string[])[],
  budget: ReusabilityBudget | undefined,
  allocator: ClassNameAllocator,
): ReusabilityPlan {
  const normalizedBudget = normalizeReusabilityBudget(budget);
  const canonicalCompositions = compositions.map((atomicClasses) => [...new Set(atomicClasses)].sort());
  const identities = canonicalCompositions.map((atomicClasses) => atomicClasses.join('\u0000'));
  const allIdentities = [...new Set(identities.filter(Boolean))];

  if (normalizedBudget === 0) {
    const names = allocator.allocate(allIdentities.map(compositeNameIdentity));
    return createCompleteCompositionPlan(identities, canonicalCompositions, names);
  }
  if (normalizedBudget === 100) {
    return {
      classNames: new Map(
        identities.map((identity, index) => [identity, canonicalCompositions[index]!.join(' ')] as const),
      ),
      fragments: new Map(),
    };
  }

  const groups = factorReusableGroups(reusableGroups(canonicalCompositions));
  const selectedGroups = selectReusableGroups(
    groups,
    canonicalCompositions.reduce((total, atomicClasses) => total + atomicClasses.length, 0),
    normalizedBudget,
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
