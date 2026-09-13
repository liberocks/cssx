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
  const atoms: UtilityDeclaration[][] = [];
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
    if (
      declaration.property === '--cssx-scale-x' &&
      declarations[index + 1]?.property === '--cssx-scale-y' &&
      declarations[index + 2]?.property === 'scale'
    ) {
      const y = declarations[index + 1]!;
      const sink = declarations[index + 2]!;
      atoms.push([declaration, sink], [y, sink]);
      index += 2;
      continue;
    }
    if (
      [
        '--cssx-translate-x',
        '--cssx-translate-y',
        '--cssx-scale-x',
        '--cssx-scale-y',
        '--cssx-skew-x',
        '--cssx-skew-y',
      ].includes(declaration.property)
    ) {
      const sink = declarations[index + 1];
      if (sink?.property === 'translate' || sink?.property === 'scale' || sink?.property === 'transform') {
        atoms.push([declaration, sink]);
        index++;
        continue;
      }
    }
    atoms.push([declaration]);
  }
  return atoms;
}
