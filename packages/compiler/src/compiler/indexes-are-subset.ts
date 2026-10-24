/**
 * Returns whether every sorted child index belongs to the sorted parent list.
 *
 * @param child Sorted indexes to look up in `parent`.
 * @param parent Sorted index list that may contain every child index.
 * @returns Whether every `child` index appears in `parent`.
 */
export function indexesAreSubset(child: readonly number[], parent: readonly number[]): boolean {
  let parentIndex = 0;
  for (const index of child) {
    while (parent[parentIndex] !== undefined && parent[parentIndex]! < index) {
      parentIndex++;
    }
    if (parent[parentIndex] !== index) {
      return false;
    }
  }
  return true;
}
