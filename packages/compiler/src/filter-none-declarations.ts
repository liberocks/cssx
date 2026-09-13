import type { UtilityDeclaration } from './utility-types';

/**
 * Builds declarations that reset every channel in a filter family.
 *
 * @param property Target filter property.
 * @param semanticGroup Reset semantic group.
 * @param semanticConflicts Groups cleared by the reset.
 * @returns Reset declarations.
 */
export function filterNoneDeclarations(
  property: 'filter' | 'backdrop-filter',
  semanticGroup: string,
  semanticConflicts: readonly string[],
): UtilityDeclaration[] {
  const declarations: UtilityDeclaration[] = [{ property, value: 'none', semanticGroup, semanticConflicts }];
  if (property === 'backdrop-filter') {
    declarations.unshift({ property: '-webkit-backdrop-filter', value: 'none', semanticGroup, semanticConflicts });
  }
  return declarations;
}
