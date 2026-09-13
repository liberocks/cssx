import { resolveNumericSvgValue } from './resolve-numeric-svg-value';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves numeric SVG stroke utility values.
 *
 * @param utility Utility name without variants.
 * @returns The SVG declaration, or null when unsupported.
 */
export function compileSvgNumericUtility(utility: string): UtilityDeclaration | null {
  const svgNumeric = /^stroke-(miterlimit|dasharray|dashoffset)-(.+)$/.exec(utility);
  if (!svgNumeric) {
    return null;
  }
  const property = `stroke-${svgNumeric[1]!}`;
  const value = resolveNumericSvgValue(svgNumeric[2]!);
  return value ? { property, value } : null;
}
