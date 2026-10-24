/**
 * Returns the indexes from a sorted parent list that are absent from its sorted child list.
 *
 * @param parent Sorted index list that owns the returned items.
 * @param child Sorted index list whose items are excluded.
 * @returns Sorted indexes present in `parent` but absent from `child`.
 */
export function complementIndexes(parent: readonly number[], child: readonly number[]): readonly number[] {
  const complement: number[] = [];
  let childIndex = 0;
  for (const index of parent) {
    if (child[childIndex] === index) {
      childIndex++;
    } else {
      complement.push(index);
    }
  }
  return complement;
}
