import { classifyUtilityGroup } from '../utilities/registry/classify-utility-group';
import { utilityFallback } from '../utilities/registry/fallback';
import { DIRECTIONAL_CONFLICTS } from '../utilities/registry/semantics-directional-conflicts';
import type { UtilitySemantics } from '../utilities/registry/utility-semantics';
import { candidateScope } from './candidate';
import type { parseCandidate } from './candidate';

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
