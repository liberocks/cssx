/**
 * Creates a stable short identifier from a string.
 *
 * @param value String to hash.
 * @returns A base-36 hash suitable for a generated file name or class name.
 */
export function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
