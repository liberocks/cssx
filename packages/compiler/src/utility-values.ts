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

/**
 * Splits declarations into independently composable class atoms.
 *
 * Related selector-scoped declarations stay together. Transform channels also
 * keep their sink declaration so an atom remains valid when a later utility
 * replaces only one axis. This is the invariant that lets compiled conflicts use
 * property-level replacement without producing incomplete CSS.
 *
 * @param declarations Ordered declarations from one utility.
 * @returns Declaration groups that can receive separate class names.
 */
export function atomizeDeclarations(
  declarations: readonly UtilityDeclaration[],
): readonly (readonly UtilityDeclaration[])[] {
  const atoms: UtilityDeclaration[][] = [];
  for (let index = 0; index < declarations.length; index++) {
    const declaration = declarations[index];
    if (!declaration) {
      continue;
    }
    if (declaration.selectorSuffix || declaration.semanticGroup) {
      const grouped: UtilityDeclaration[] = [declaration];
      while (
        declarations[index + 1]?.selectorSuffix === declaration.selectorSuffix &&
        (declaration.selectorSuffix !== undefined ||
          declarations[index + 1]?.semanticGroup === declaration.semanticGroup)
      ) {
        const next = declarations[index + 1];
        if (!next) {
          break;
        }
        grouped.push(next);
        index++;
      }
      atoms.push(grouped);
      continue;
    }
    if (
      declaration.property === '--cssx-scale-x' &&
      declarations[index + 1]?.property === '--cssx-scale-y' &&
      declarations[index + 2]?.property === 'scale'
    ) {
      const y = declarations[index + 1];
      const sink = declarations[index + 2];
      if (y && sink) {
        atoms.push([declaration, sink], [y, sink]);
      }
      index += 2;
      continue;
    }
    if (
      declaration.property === '--cssx-translate-x' ||
      declaration.property === '--cssx-translate-y' ||
      declaration.property === '--cssx-scale-x' ||
      declaration.property === '--cssx-scale-y' ||
      declaration.property === '--cssx-skew-x' ||
      declaration.property === '--cssx-skew-y'
    ) {
      const sink = declarations[index + 1];
      if (sink && (sink.property === 'translate' || sink.property === 'scale' || sink.property === 'transform')) {
        atoms.push([declaration, sink]);
        index++;
        continue;
      }
    }
    atoms.push([declaration]);
  }
  return atoms;
}

/**
 * Resolves a supported line-height name or arbitrary value.
 *
 * @param value Utility value.
 * @returns CSS line-height value.
 */
export function leadingValue(value: string): string {
  const values: Readonly<Record<string, string>> = {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  };
