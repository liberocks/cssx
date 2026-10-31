import { classifyArbitraryProperty } from '../../candidates/classify-arbitrary-property';
import { refineAmbiguousGroup } from '../../composition/refine-ambiguous-group';
import { EXACT_GROUPS } from './semantics-exact-groups';
import { PREFIX_GROUPS } from './semantics-prefix-groups';
import { STRUCTURAL_UTILITY_GROUPS } from './structural-utilities';

/**
 * Finds a semantic group from exact utility data or ordered prefixes.
 *
 * @param utility Utility name without variants.
 * @returns Semantic group, or null when no safe classification exists.
 */
export function classifyUtilityGroup(utility: string): string | null {
  const structuralGroup = STRUCTURAL_UTILITY_GROUPS[utility as keyof typeof STRUCTURAL_UTILITY_GROUPS];
  if (structuralGroup) {
    return structuralGroup;
  }
  const namedStructuralGroup = /^(group|peer)-[A-Za-z0-9_-]+$/.exec(utility);
  if (namedStructuralGroup) {
    return `structural-${namedStructuralGroup[1]}:${utility}`;
  }
  if (utility.startsWith('~text-')) {
    return 'font-size';
  }
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
