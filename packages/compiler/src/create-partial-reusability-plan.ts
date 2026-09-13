import { compositeIdentity } from './composite-identity';
import { compositeNameIdentity } from './composite-name-identity';
import type { ReusabilityPlan, ReusableFragment } from './reusability';

/**
 * Builds class and fragment maps from the prepared partial-reuse stages.
 *
 * @param identities Stable composition identities aligned with the compositions.
 * @param reusableFragments Reusable fragments indexed by composition.
 * @param residualCompositions Residual atoms indexed by composition.
 * @param residualNames Allocated names keyed by compiler-scoped residual identity.
 * @returns Final class strings and their reusable fragments.
 */
export function createPartialReusabilityPlan(
  identities: readonly string[],
  reusableFragments: readonly (readonly ReusableFragment[])[],
  residualCompositions: readonly (readonly string[])[],
  residualNames: ReadonlyMap<string, string>,
): ReusabilityPlan {
  const classNames = new Map<string, string>();
  const fragmentsByComposition = new Map<string, readonly ReusableFragment[]>();
  for (let index = 0; index < identities.length; index++) {
    const identity = identities[index]!;
    if (!identity || classNames.has(identity)) {
      continue;
    }
    const fragments = reusableFragments[index]!;
    const residualAtoms = residualCompositions[index]!;
    const residualIdentity = compositeIdentity(residualAtoms);
    const residualClassName = residualIdentity ? residualNames.get(compositeNameIdentity(residualIdentity))! : '';
    const classParts: string[] = [];
    for (const fragment of fragments) {
      if (fragment.className) {
        classParts.push(fragment.className);
      }
    }
    if (residualClassName) {
      classParts.push(residualClassName);
    }
    const className = classParts.join(' ');
    classNames.set(identity, className);
    fragmentsByComposition.set(identity, [
      ...fragments,
      ...(residualClassName ? [{ className: residualClassName, atomicClasses: residualAtoms }] : []),
    ]);
  }
  return { classNames, fragments: fragmentsByComposition };
}
