import type { UtilityDeclaration } from './utility-types';

/**
 * Clones declarations before a compiler phase mutates their values.
 *
 * @param declarations Declarations to clone.
 * @returns Mutable declaration copies.
 */
export function cloneDeclarations(declarations: readonly UtilityDeclaration[]): UtilityDeclaration[] {
  return declarations.map((declaration) => ({ ...declaration }));
}
