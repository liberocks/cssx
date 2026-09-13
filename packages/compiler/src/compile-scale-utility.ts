import type { UtilityDeclaration } from './utility-types';
import { resolveScaleValue } from './utility-values';

/**
 * Compiles shared and axis-specific scale utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @returns Scale declarations, or null when unsupported.
 */
export function compileScaleUtility(utility: string, negative: boolean): UtilityDeclaration[] | null {
  const scale = /^(scale-x|scale-y|scale-z|scale)-(.+)$/.exec(utility);
  if (!scale) {
    return null;
  }
  const axis = scale[1]!;
  const value = resolveScaleValue(scale[2]!, negative);
  if (!value) {
    return null;
  }
  if (axis === 'scale-x') {
    return [
      { property: '--cssx-scale-x', value },
      { property: 'scale', value: 'var(--cssx-scale-x, 1) var(--cssx-scale-y, 1) var(--cssx-scale-z, 1)' },
    ];
  }
  if (axis === 'scale-y') {
    return [
      { property: '--cssx-scale-y', value },
      { property: 'scale', value: 'var(--cssx-scale-x, 1) var(--cssx-scale-y, 1) var(--cssx-scale-z, 1)' },
    ];
  }
  if (axis === 'scale-z') {
    return [
      { property: '--cssx-scale-z', value },
      { property: 'scale', value: 'var(--cssx-scale-x, 1) var(--cssx-scale-y, 1) var(--cssx-scale-z, 1)' },
    ];
  }
  return [
    { property: '--cssx-scale-x', value },
    { property: '--cssx-scale-y', value },
    { property: 'scale', value: 'var(--cssx-scale-x, 1) var(--cssx-scale-y, 1) var(--cssx-scale-z, 1)' },
  ];
}
