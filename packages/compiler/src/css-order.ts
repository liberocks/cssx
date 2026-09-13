import type { ParsedCandidate } from './candidate-types';
import { SHORTHAND_WRITE_SETS } from './shorthand-write-sets';
import type { UtilityDeclaration } from './utility-types';

/**
 * Explicit ordering for groups where broad declarations must precede narrow ones.
 *
 * The same order is used for all output so generated CSS remains deterministic
 * and directional utilities retain normal CSS cascade behavior after atomization.
 */
const CASCADE_GROUP_ORDER: Readonly<Record<string, number>> = {
  p: 100,
  px: 110,
  py: 110,
  pt: 120,
  pr: 120,
  pb: 120,
  pl: 120,
  ps: 120,
  pe: 120,
  m: 200,
  mx: 210,
  my: 210,
  mt: 220,
  mr: 220,
  mb: 220,
  ml: 220,
  ms: 220,
  me: 220,
  inset: 300,
  'inset-x': 310,
  'inset-y': 310,
  top: 320,
  right: 320,
  bottom: 320,
  left: 320,
  start: 320,
  end: 320,
  size: 400,
  width: 410,
  height: 410,
  'min-width': 410,
  'max-width': 410,
  'min-height': 410,
  'max-height': 410,
  gap: 500,
  'row-gap': 510,
  'column-gap': 510,
  border: 600,
  'border-width': 600,
  'border-x': 610,
  'border-y': 610,
  'border-top': 620,
  'border-right': 620,
  'border-bottom': 620,
  'border-left': 620,
};

/**
 * Builds a lexical sort key for variants, semantic groups, and atom position.
 *
 * @param candidate Parsed utility candidate.
 * @param group Semantic group written by the candidate.
 * @param declarations Declarations whose atom positions are ordered.
 * @returns Stable CSS ordering key.
 */
export function cssOrder(
  candidate: ParsedCandidate,
  group: string,
  declarations: readonly UtilityDeclaration[],
): string {
  const variantOrder = candidate.variants
    .map((variant) => {
      const known = { sm: 100, md: 101, lg: 102, xl: 103, '2xl': 104, dark: 200, print: 300 }[variant];
      return `${String(known ?? 10).padStart(3, '0')}:${variant}`;
    })
    .join(':');
  const groupOrder = String(CASCADE_GROUP_ORDER[group] ?? 900).padStart(3, '0');
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
  const phase = isViewTransition
    ? 500
    : isStartingStyle
      ? 400
      : isEnhancement
        ? 300
        : isShorthand || isController
          ? 100
          : 200;
  return `${String(phase).padStart(3, '0')}\u0000${variantOrder}\u0000${groupOrder}\u0000${group}`;
}