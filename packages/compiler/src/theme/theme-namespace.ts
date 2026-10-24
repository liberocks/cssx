/**
 * Creates a compact deterministic namespace for a resolved theme signature.
 *
 * Two independent 32-bit hash lanes avoid BigInt costs in the hot
 * static-style compilation path while separating generated-name identities.
 *
 * @param value Serialized theme signature.
 * @returns Two base-36 hash lanes separated by a hyphen.
 */
export function themeNamespace(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`;
}
