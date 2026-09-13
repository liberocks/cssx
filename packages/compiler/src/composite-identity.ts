/**
 * Creates a stable identity from the atomic classes in a composition.
 *
 * @param atomicClasses Atomic class names that implement the composition.
 * @returns Sorted, deduplicated class names separated by a null character.
 */
export function compositeIdentity(atomicClasses: readonly string[]): string {
  return [...new Set(atomicClasses)].sort().join('\u0000');
}
