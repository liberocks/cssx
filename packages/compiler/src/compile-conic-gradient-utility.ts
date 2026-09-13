import { gradientInterpolation } from './gradient-interpolation';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves conic-gradient utilities, including numeric and arbitrary start angles.
 *
 * @param utility Utility name without variants.
 * @param negative Whether a numeric angle is negated.
 * @returns The background-image declaration, or null when unsupported.
 */
export function compileConicGradientUtility(utility: string, negative: boolean): UtilityDeclaration[] | null {
  const conic =
    /^bg-conic(?:-(\d+|\[[^\]]+\]))?(?:\/(srgb|oklch|oklab|hsl|longer|shorter|increasing|decreasing))?$/.exec(utility);
  if (!conic) {
    return null;
  }
  const rawAngle = conic[1];
  const angle = rawAngle
    ? rawAngle.startsWith('[')
      ? rawAngle.slice(1, -1)
      : `${negative ? '-' : ''}${rawAngle}deg`
    : '';
  return [
    {
      property: 'background-image',
      value: `conic-gradient(from ${angle || '0deg'} ${gradientInterpolation(conic[2])}at center, var(--cssx-gradient-via-stops, var(--cssx-gradient-stops)))`,
      semanticGroup: 'background-image',
    },
  ];
}
