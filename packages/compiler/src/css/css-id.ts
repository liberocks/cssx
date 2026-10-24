/**
 * Creates a stable compact identifier for one complete CSS payload.
 *
 * @param value CSS used as the identifier input.
 * @returns A deterministic CSSX class name.
 */
export function cssId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `cssx-${(hash >>> 0).toString(36)}`;
}
