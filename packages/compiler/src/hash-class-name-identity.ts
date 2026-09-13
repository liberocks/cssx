/**
 * Computes a compact deterministic 64-bit hash for generated class names.
 *
 * @param value Full class-name identity.
 * @returns Base-36 hash text.
 */
export function hashClassNameIdentity(value: string): string {
  let result = 0xcbf29ce484222325n;
  for (let index = 0; index < value.length; index++) {
    result ^= BigInt(value.charCodeAt(index));
    result = BigInt.asUintN(64, result * 0x100000001b3n);
  }
  return result.toString(36);
}
