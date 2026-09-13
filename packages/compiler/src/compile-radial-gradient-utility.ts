import { gradientInterpolation } from './gradient-interpolation';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves radial-gradient utilities.
 *
 * @param utility Utility name without variants.
 * @returns The background-image declaration, or null when unsupported.
 */
export function compileRadialGradientUtility(utility: string): UtilityDeclaration[] | null {
  const radial = /^bg-radial(?:\/(srgb|oklch|oklab|hsl|longer|shorter|increasing|decreasing))?$/.exec(utility);
  if (!radial) {
    return null;
  }
  return [
    {
      property: 'background-image',
      value: `radial-gradient(${gradientInterpolation(radial[1])}var(--cssx-gradient-via-stops, var(--cssx-gradient-stops)))`,
      semanticGroup: 'background-image',
    },
  ];
}
