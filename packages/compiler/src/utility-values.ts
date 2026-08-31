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
    const declaration = declarations[index]!;
    if (declaration.selectorSuffix || declaration.semanticGroup) {
      const grouped: UtilityDeclaration[] = [declaration];
      while (
        declarations[index + 1]?.selectorSuffix === declaration.selectorSuffix &&
        (declaration.selectorSuffix !== undefined ||
          declarations[index + 1]?.semanticGroup === declaration.semanticGroup)
      ) {
        const next = declarations[index + 1]!;
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
      const y = declarations[index + 1]!;
      const sink = declarations[index + 2]!;
      atoms.push([declaration, sink], [y, sink]);
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
  return value.startsWith('[') ? value.slice(1, -1) : (values[value] ?? value);
}

/**
 * Resolves a supported letter-spacing name.
 *
 * @param value Utility value.
 * @returns CSS letter-spacing value.
 */
export function trackingValue(value: string): string {
  const values: Readonly<Record<string, string>> = {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  };
  return values[value] ?? value;
}

/**
 * Converts a duration utility value to milliseconds when needed.
 *
 * @param value Utility value.
 * @returns CSS duration value.
 */
export function millisecondsValue(value: string): string {
  return value.startsWith('[') ? value.slice(1, -1) : `${value}ms`;
}

/**
 * Resolves a degree or arbitrary angle value.
 *
 * @param value Utility value.
 * @param negative Whether to negate the value.
 * @returns CSS angle, or null when unsupported.
 */
export function resolveAngleValue(value: string, negative: boolean): string | null {
  if (value.startsWith('[') && value.endsWith(']')) {
    return `${negative ? '-' : ''}${value.slice(1, -1)}`;
  }
  if (!/^\d+$/.test(value)) {
    return null;
  }
  return `${negative ? '-' : ''}${value}deg`;
}

/**
 * Resolves a percentage scale utility value.
 *
 * @param value Utility value.
 * @param negative Whether to negate the value.
 * @returns CSS scale number, or null when unsupported.
 */
export function resolveScaleValue(value: string, negative: boolean): string | null {
  if (value.startsWith('[') && value.endsWith(']')) {
    return `${negative ? '-' : ''}${value.slice(1, -1)}`;
  }
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const fraction = Number(value) / 100;
  return negative ? `-${fraction}` : String(fraction);
}
