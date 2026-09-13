import { candidateScope } from './candidate';
import type { parseCandidate } from './candidate';
import { classifyUtilityGroup } from './classify-utility-group';
import { utilityFallback } from './fallback';
import { DIRECTIONAL_CONFLICTS } from './semantics-directional-conflicts';
import type { UtilitySemantics } from './utility-semantics';

/**
 * Maps an already parsed utility to CSSX-owned semantic write domains.
 *
 * @param candidate Parsed static utility string.
 * @returns Semantic write data, or null when CSSX does not support the utility.
 */
export function classifyParsedCandidate(candidate: ReturnType<typeof parseCandidate>): UtilitySemantics | null {
  const utility = candidate.utility;
  const group = classifyUtilityGroup(utility);
  const fallback = group ? undefined : utilityFallback(candidate.raw);
  if (!group && !fallback) {
    return null;
  }
  return {
    scope: candidateScope(candidate),
    group: group ?? fallback!.group,
    conflicts: group ? (DIRECTIONAL_CONFLICTS[group] ?? [group]) : [fallback!.group],
  };
}
