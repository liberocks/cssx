import { containsUnsafeArbitrarySyntax } from './contains-unsafe-arbitrary-syntax';
import { containsUnsafeTopLevelSyntax } from './contains-unsafe-top-level-syntax';

/** Variants whose order does not change their meaning. */
const COMMUTATIVE_VARIANTS = new Set([
  'active',
  'disabled',
  'empty',
  'enabled',
  'even',
  'first',
  'focus',
  'focus-visible',
  'focus-within',
  'hover',
  'last',
  'odd',
  'open',
  'required',
  'target',
  'visited',
]);

/** Stable order for sortable responsive and environment variants. */
const VARIANT_ORDER = new Map<string, number>([
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

/**
 * Gives commutative variants one canonical order so equivalent candidates share CSS.
 *
 * @param variants Parsed variant names.
 * @param raw Original candidate used in validation errors.
 * @returns Original or canonically ordered variants.
 */
export function normalizeCandidateVariants(variants: readonly string[], raw: string): readonly string[] {
  for (const variant of variants) {
    if (!variant || containsUnsafeTopLevelSyntax(variant) || containsUnsafeArbitrarySyntax(variant)) {
      throw new Error(`Invalid utility "${raw}".`);
    }
  }
  const sortable = variants.every((variant) => COMMUTATIVE_VARIANTS.has(variant) || VARIANT_ORDER.has(variant));
  if (!sortable) {
    return variants;
  }
  return [...variants].sort((left, right) => {
    const leftOrder = VARIANT_ORDER.get(left) ?? 100;
    const rightOrder = VARIANT_ORDER.get(right) ?? 100;
    return leftOrder - rightOrder || left.localeCompare(right);
  });
}
