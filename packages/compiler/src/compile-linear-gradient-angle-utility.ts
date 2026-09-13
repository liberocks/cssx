import { gradientInterpolation } from './gradient-interpolation';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves angle-based linear-gradient utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether a numeric angle is negated.
 * @returns The background-image declaration, or null when unsupported.
 */
export function compileLinearGradientAngleUtility(utility: string, negative: boolean): UtilityDeclaration[] | null {
  const angle = /^bg-linear-(\d+|\[[^\]]+\])(?:\/(srgb|oklch|oklab|hsl|longer|shorter|increasing|decreasing))?$/.exec(
    utility,
  );
  if (!angle) {
    return null;
  }
  const rawAngle = angle[1]!;
  const value = rawAngle.startsWith('[') ? rawAngle.slice(1, -1) : `${negative ? '-' : ''}${rawAngle}deg`;
  return [
    {
      property: 'background-image',
      value: `linear-gradient(${gradientInterpolation(angle[2])}${value}, var(--cssx-gradient-via-stops, var(--cssx-gradient-stops)))`,
      semanticGroup: 'background-image',
    },
  ];
}
