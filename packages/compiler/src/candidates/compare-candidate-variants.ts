/** Stable order for sortable responsive and environment variants. */
export const candidateVariantOrder = new Map<string, number>([
  ['sm', 10],
  ['md', 20],
  ['lg', 30],
  ['xl', 40],
  ['2xl', 50],
  ['dark', 60],
  ['motion-safe', 65],
  ['motion-reduce', 65],
  ['print', 70],
]);

/** Compares two normalized CSSX variant paths using the compiler's shared order. */
export function compareCandidateVariants(left: readonly string[], right: readonly string[]): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftVariant = left[index]!;
    const rightVariant = right[index]!;
    const order = (candidateVariantOrder.get(leftVariant) ?? 100) - (candidateVariantOrder.get(rightVariant) ?? 100);
    if (order !== 0) {
      return order;
    }
    const name = leftVariant.localeCompare(rightVariant);
    if (name !== 0) {
      return name;
    }
  }
  return left.length - right.length;
}
