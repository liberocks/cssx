import { STRUCTURAL_UTILITY_NAMES } from './structural-utilities';

/** Returns the source class represented by a structural semantic group. */
export function structuralUtilityName(group: string): string | null {
  return (
    STRUCTURAL_UTILITY_NAMES[group as keyof typeof STRUCTURAL_UTILITY_NAMES] ??
    /^structural-(?:group|peer):(.+)$/.exec(group)?.[1] ??
    null
  );
}
