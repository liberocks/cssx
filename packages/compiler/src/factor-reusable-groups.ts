import { compareReusableGroups } from './compare-reusable-groups';
import { complementIndexes } from './complement-indexes';
import { indexesAreSubset } from './indexes-are-subset';
import type { ReusableGroup } from './reusability';
import { reusableGroup } from './reusable-groups';
import { usageKey } from './usage-key';

/**
 * Combines a repeated bundle with two low-value groups that partition its use.
 * This preserves exact composition semantics while avoiding one alias per atom
 * for correlated dimensions.
 *
 * @param groups Reusable groups eligible for factoring.
 * @returns The same groups with factored bundles added and superseded groups removed.
 */
export function factorReusableGroups(groups: readonly ReusableGroup[]): readonly ReusableGroup[] {
  const omitted = new Set<ReusableGroup>();
  const additions: ReusableGroup[] = [];
  for (const parent of groups) {
    if (parent.atomicClasses.length < 2 || parent.compositionIndexes.length < 4 || omitted.has(parent)) {
      continue;
    }
    const children = groups.filter(
      (child) =>
        child !== parent &&
        child.score <= 0 &&
        child.compositionIndexes.length >= 2 &&
        child.compositionIndexes.length < parent.compositionIndexes.length &&
        indexesAreSubset(child.compositionIndexes, parent.compositionIndexes),
    );
    /** Locates a candidate child by its exact sorted usage set. */
    const childIndexes = new Map(children.map((child, index) => [usageKey(child.compositionIndexes), index]));
    for (let leftIndex = 0; leftIndex < children.length; leftIndex++) {
      const left = children[leftIndex]!;
      const complement = complementIndexes(parent.compositionIndexes, left.compositionIndexes);
      const rightIndex = childIndexes.get(usageKey(complement));
      if (rightIndex === undefined || rightIndex <= leftIndex) {
        continue;
      }
      const right = children[rightIndex]!;
      omitted.add(parent);
      omitted.add(left);
      omitted.add(right);
      additions.push(
        reusableGroup([...parent.atomicClasses, ...left.atomicClasses].sort(), left.compositionIndexes),
        reusableGroup([...parent.atomicClasses, ...right.atomicClasses].sort(), right.compositionIndexes),
      );
      break;
    }
  }
  return [...groups.filter((group) => !omitted.has(group)), ...additions].sort(compareReusableGroups);
}
