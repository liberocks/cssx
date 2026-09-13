import type { ParsedCandidate } from './candidate-types';
import { SHORTHAND_WRITE_SETS } from './shorthand-write-sets';
import type { UtilityDeclaration } from './utility-types';

/**
 * Selects the cascade phase for declarations whose ordering affects composition.
 *
 * @param candidate Parsed utility candidate and its variants.
 * @param declarations Declarations emitted for the candidate.
 * @returns Numeric phase used as the first CSS sort-key segment.
 */
export function cssOrderPhase(candidate: ParsedCandidate, declarations: readonly UtilityDeclaration[]): number {
  let isController = false;
  let isShorthand = false;
  let isEnhancement = false;
  for (const { property } of declarations) {
    isController ||= declarations.length > 1 && property === 'transition-property';
    isShorthand ||= SHORTHAND_WRITE_SETS[property] !== undefined;
    isEnhancement ||=
      property === 'animation-timeline' ||
      property.startsWith('animation-range') ||
      property.startsWith('scroll-timeline') ||
      property.startsWith('view-timeline') ||
      property === 'timeline-scope';
  }
  const isStartingStyle = candidate.variants.includes('starting');
  const isViewTransition = candidate.variants.some((variant) => variant.startsWith('vt-'));
  return isViewTransition ? 500 : isStartingStyle ? 400 : isEnhancement ? 300 : isShorthand || isController ? 100 : 200;
}
