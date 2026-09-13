import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles a `break-*` layout utility.
 *
 * @param utility Utility candidate without variants.
 * @returns Break declaration, or null when the candidate is outside this family.
 */
export function compilePrefixedBreakUtility(utility: string): UtilityDeclaration | null {
  const match =
    /^(?:break-(before|after)-(auto|avoid|all|avoid-page|page|left|right|column)|break-(inside)-(auto|avoid|avoid-page|avoid-column))$/.exec(
      utility,
    );
  if (!match) {
    return null;
  }
  const family = match[1] ?? match[3]!;
  const value = match[2] ?? match[4]!;
  return { property: `break-${family}`, value };
}
