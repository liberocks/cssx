import { candidateVariantOrder, compareCandidateVariants } from './compare-candidate-variants';
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
  const sortable = variants.every((variant) => COMMUTATIVE_VARIANTS.has(variant) || candidateVariantOrder.has(variant));
  if (!sortable) {
    return variants;
  }
  return [...variants].sort((left, right) => compareCandidateVariants([left], [right]));
}
