import { gradientInterpolation } from './gradient-interpolation';
import type { UtilityDeclaration } from './utility-types';

/** Direction keywords accepted by linear-gradient utilities. */
const DIRECTIONS: Readonly<Record<string, string>> = {
  t: 'to top',
  tr: 'to top right',
  r: 'to right',
  br: 'to bottom right',
  b: 'to bottom',
  bl: 'to bottom left',
  l: 'to left',
  tl: 'to top left',
};

/**
 * Resolves directional linear-gradient utilities.
 *
 * @param utility Utility name without variants.
 * @returns The background-image declaration, or null when unsupported.
 */
export function compileDirectionalGradientUtility(utility: string): UtilityDeclaration[] | null {
  const direction =
    /^bg-linear-to-(t|tr|r|br|b|bl|l|tl)(?:\/(srgb|oklch|oklab|hsl|longer|shorter|increasing|decreasing))?$/.exec(
      utility,
    );
  if (!direction) {
    return null;
  }
  const value = DIRECTIONS[direction[1]!]!;
  return [
    {
      property: 'background-image',
      value: `linear-gradient(${gradientInterpolation(direction[2])}${value}, var(--cssx-gradient-via-stops, var(--cssx-gradient-stops)))`,
      semanticGroup: 'background-image',
    },
  ];
}
