import { PSEUDO_ELEMENT_VARIANTS } from './pseudo-variant-selectors';
import { resolveViewTransitionVariant } from './resolve-view-transition-variant';

/**
 * Rejects combinations whose selector categories cannot compose predictably.
 *
 * @param variants Variant names to validate.
 * @throws When a View Transition variant is combined with an incompatible selector category.
 */
export function validateVariantCombination(variants: readonly string[]): void {
  const viewTransitionVariants = variants.filter((variant) => resolveViewTransitionVariant(variant));
  if (viewTransitionVariants.length === 0) {
    return;
  }
  const incompatible = variants.find(
    (variant) =>
      !viewTransitionVariants.includes(variant) &&
      (variant === '*' ||
        variant === '**' ||
        PSEUDO_ELEMENT_VARIANTS[variant] !== undefined ||
        variant.startsWith('group-') ||
        variant.startsWith('peer-') ||
        variant.startsWith('has-') ||
        variant.startsWith('in-') ||
        (variant.startsWith('[') && !variant.startsWith('[@supports') && !variant.startsWith('[@media'))),
  );
  if (viewTransitionVariants.length > 1 || incompatible) {
    throw new Error('CSSX View Transition variants cannot compose with relationship or pseudo-element variants.');
  }
}
