import { compositeIdentity } from './composite-identity';
import type { ReusableGroup } from './reusability';

/**
 * Orders reusable fragments deterministically by the existing score policy.
 *
 * @param left First reusable group to compare.
 * @param right Second reusable group to compare.
 * @returns Negative, zero, or positive when `left` sorts before, with, or after `right`.
 */
export function compareReusableGroups(left: ReusableGroup, right: ReusableGroup): number {
  return (
    right.score - left.score ||
    right.coverage - left.coverage ||
    compositeIdentity(left.atomicClasses).localeCompare(compositeIdentity(right.atomicClasses))
  );
}
