import { classifyArbitraryProperty } from './classify-arbitrary-property';
import { refineAmbiguousGroup } from './refine-ambiguous-group';
import { EXACT_GROUPS } from './semantics-exact-groups';
import { PREFIX_GROUPS } from './semantics-prefix-groups';

/**
 * Finds a semantic group from exact utility data or ordered prefixes.
 *
 * @param utility Utility name without variants.
 * @returns Semantic group, or null when no safe classification exists.
 */
export function classifyUtilityGroup(utility: string): string | null {
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
