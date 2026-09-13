import { compositeIdentity } from './composite-identity';
import { compositeNameIdentity } from './composite-name-identity';
import type { ReusableFragment, ReusableGroup } from './reusability';

/**
 * Places each named reusable group in the compositions it covers.
 *
 * @param compositionCount Number of source compositions.
 * @param groups Selected reusable groups.
 * @param names Allocated names keyed by compiler-scoped group identity.
 * @returns Reusable fragments indexed by their source composition.
 */
export function reusableFragmentsByComposition(
  compositionCount: number,
  groups: readonly ReusableGroup[],
  names: ReadonlyMap<string, string>,
): readonly (readonly ReusableFragment[])[] {
  const fragmentsByComposition: ReusableFragment[][] = [];
  for (let index = 0; index < compositionCount; index++) {
    fragmentsByComposition.push([]);
  }
  for (const group of groups) {
    const identity = compositeIdentity(group.atomicClasses);
    const className = names.get(compositeNameIdentity(identity))!;
    const fragment = { className, atomicClasses: group.atomicClasses };
    for (const compositionIndex of group.compositionIndexes) {
      fragmentsByComposition[compositionIndex]!.push(fragment);
    }
  }
  return fragmentsByComposition;
}
