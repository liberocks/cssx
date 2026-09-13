import type { UtilityDeclaration } from './utility-types';
import { resolveAngleValue } from './utility-values';

/**
 * Compiles standard and axis-specific skew utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @returns Skew declarations, or null when unsupported.
 */
export function compileSkewUtility(utility: string, negative: boolean): UtilityDeclaration[] | null {
  const skew = /^skew-(x|y)-(.+)$/.exec(utility);
  if (skew) {
    const axis = skew[1]!;
    const value = resolveAngleValue(skew[2]!, negative);
    if (!value) {
      return null;
    }
    return [
      { property: `--cssx-skew-${axis}`, value },
      { property: 'transform', value: 'skewX(var(--cssx-skew-x, 0deg)) skewY(var(--cssx-skew-y, 0deg))' },
    ];
  }
  const skewBoth = /^skew-(.+)$/.exec(utility);
  if (skewBoth) {
    const value = resolveAngleValue(skewBoth[1]!, negative);
    return value
      ? [
          { property: '--cssx-skew-x', value },
          { property: '--cssx-skew-y', value },
          { property: 'transform', value: 'skewX(var(--cssx-skew-x, 0deg)) skewY(var(--cssx-skew-y, 0deg))' },
        ]
      : null;
  }
  return null;
}
