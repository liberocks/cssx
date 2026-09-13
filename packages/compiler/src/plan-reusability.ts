import type { ClassNameAllocator } from './class-name';
import { compositeNameIdentity } from './composite-name-identity';
import { createCompleteCompositionPlan } from './create-complete-composition-plan';
import { normalizeReusabilityBudget } from './normalize-reusability-budget';
import { planPartialReusability } from './plan-partial-reusability';
import type { ReusabilityBudget, ReusabilityPlan } from './reusability';

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

  return planPartialReusability(canonicalCompositions, identities, normalizedBudget, allocator);
}
