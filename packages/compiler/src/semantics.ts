import { candidateScope, parseCandidate } from './candidate';
import { DIRECTIONAL_CONFLICTS } from './semantics-directional-conflicts';
import { EXACT_GROUPS } from './semantics-exact-groups';
import { PREFIX_GROUPS } from './semantics-prefix-groups';

/** Style groups used to merge one utility with later utilities. */
export interface UtilitySemantics {
  /** Variant and importance scope where the utility writes. */
  readonly scope: string;
  /** Primary semantic group owned by the utility. */
  readonly group: string;
  /** Groups the utility clears when it is applied later. */
  readonly conflicts: readonly string[];
}

/**
 * Maps a parsed utility to CSSX-owned semantic write domains. The compiler and
 * runtime deliberately share this description so composition never needs a
 * browser-side utility parser.
 *
 * @param candidateSource Static utility string to classify.
 * @returns Semantic write data, or null when CSSX does not support the utility.
 */
export function classifyCandidate(candidateSource: string): UtilitySemantics | null {
  const candidate = parseCandidate(candidateSource);
  const utility = candidate.utility;
  const group = classifyUtilityGroup(utility);
  if (!group) {
    return null;
  }
  return {
    scope: candidateScope(candidate),
    group,
    conflicts: DIRECTIONAL_CONFLICTS[group] ?? [group],
  };
}

/**
 * Finds a semantic group from exact utility data or ordered prefixes.
 *
 * @param utility Utility name without variants.
 * @returns Semantic group, or null when no safe classification exists.
 */
function classifyUtilityGroup(utility: string): string | null {
  if (utility.startsWith('[') && utility.endsWith(']')) {
    return classifyArbitraryProperty(utility);
  }
  const exact = EXACT_GROUPS[utility];
  if (exact) {
    return exact.group;
  }

  for (const [prefix, group] of PREFIX_GROUPS) {
    if (utility.startsWith(prefix)) {
      return refineAmbiguousGroup(prefix, group, utility);
    }
  }
  return null;
}

/**
 * Classifies a valid arbitrary property without interpreting its value.
 *
 * @param utility Bracketed arbitrary property utility.
 * @returns Property-owned semantic group, or null for invalid syntax.
 */
function classifyArbitraryProperty(utility: string): string | null {
  const property = utility.slice(1, -1).split(':', 1)[0]?.trim().toLowerCase();
  if (!property || !/^(--[a-z0-9_-]+|[a-z-]+)$/i.test(property)) {
    return null;
  }
  return `arbitrary..${property}`;
}

/**
 * Resolves prefixes whose value determines which CSS property they write.
 *
 * @param prefix Matched utility prefix.
 * @param group Default group from the prefix table.
 * @param utility Complete utility name.
 * @returns Most precise semantic group for the utility.
 */
function refineAmbiguousGroup(prefix: string, group: string, utility: string): string {
