import type { UtilityDeclaration } from './utility-types';
import { resolveAngleValue } from './utility-values';

/**
 * Compiles standard and axis-specific rotation utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @returns Rotation declarations, or null when unsupported.
 */
export function compileRotateUtility(utility: string, negative: boolean): UtilityDeclaration[] | null {
  const rotate3d = /^rotate-(x|y|z)-(.+)$/.exec(utility);
  if (rotate3d) {
    const value = resolveAngleValue(rotate3d[2]!, negative);
    return value ? [{ property: 'rotate', value: `${rotate3d[1]} ${value}` }] : null;
  }
  const rotate = /^rotate-(.+)$/.exec(utility);
  if (rotate) {
    const value = resolveAngleValue(rotate[1]!, negative);
    return value ? [{ property: 'rotate', value }] : null;
  }
  return null;
}
