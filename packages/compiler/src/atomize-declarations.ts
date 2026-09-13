import { atomizeTransformDeclaration } from './atomize-transform-declaration';
import type { UtilityDeclaration } from './utility-types';

/**
 * Splits declarations into independently composable class atoms.
 *
 * @param declarations Ordered declarations from one utility.
 * @returns Declaration groups that can receive separate class names.
 */
export function atomizeDeclarations(
  declarations: readonly UtilityDeclaration[],
): readonly (readonly UtilityDeclaration[])[] {
  const atoms: (readonly UtilityDeclaration[])[] = [];
  for (let index = 0; index < declarations.length; index++) {
    const declaration = declarations[index]!;
    if (declaration.selectorSuffix || declaration.semanticGroup) {
      const grouped: UtilityDeclaration[] = [declaration];
      while (
        declarations[index + 1]?.selectorSuffix === declaration.selectorSuffix &&
        (declaration.selectorSuffix !== undefined ||
          declarations[index + 1]?.semanticGroup === declaration.semanticGroup)
      ) {
        grouped.push(declarations[++index]!);
      }
      atoms.push(grouped);
      continue;
    }
    const transformAtoms = atomizeTransformDeclaration(declarations, index);
    if (transformAtoms) {
      atoms.push(...transformAtoms.atoms);
      index += transformAtoms.consumedDeclarations;
      continue;
    }
    atoms.push([declaration]);
  }
  return atoms;
}
