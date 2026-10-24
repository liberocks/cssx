import { compositeNameIdentity } from './composite-name-identity';
import type { ReusabilityPlan, ReusableFragment } from './reusability';

/**
 * Converts a complete-composition allocation to the common planner result.
 *
 * @param identities Canonical composition identities, one per style entry.
 * @param compositions Canonical atomic classes for each style entry.
 * @param names Allocated class names keyed by composite name identity.
 * @returns Class strings and one alias fragment for every composition.
 */
export function createCompleteCompositionPlan(
  identities: readonly string[],
  compositions: readonly (readonly string[])[],
  names: ReadonlyMap<string, string>,
): ReusabilityPlan {
  const classNames = new Map<string, string>();
  const fragments = new Map<string, readonly ReusableFragment[]>();
  for (let index = 0; index < identities.length; index++) {
    const identity = identities[index]!;
    if (!identity || classNames.has(identity)) {
      continue;
    }
    const className = names.get(compositeNameIdentity(identity))!;
    classNames.set(identity, className);
    fragments.set(identity, [{ className, atomicClasses: compositions[index]! }]);
  }
  return { classNames, fragments };
}
