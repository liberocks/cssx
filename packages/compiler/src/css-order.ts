import type { ParsedCandidate } from './candidate-types';
import { CASCADE_GROUP_ORDER } from './cascade-group-order';
import { cssOrderPhase } from './css-order-phase';
import type { UtilityDeclaration } from './utility-types';

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
  const phase = cssOrderPhase(candidate, declarations);
  return `${String(phase).padStart(3, '0')}\u0000${variantOrder}\u0000${groupOrder}\u0000${group}`;
}
