import { arbitraryValue } from './arbitrary-value';
import type { UtilityDeclaration } from './utility-types';

/** Feature query used by animation range declarations. */
const RANGE_SUPPORT = '@supports (animation-range: normal)';

/**
 * Compiles animation attachment range utilities.
 *
 * @param utility Utility name without variants.
 * @returns Range declaration, or null when unsupported.
 */
export function compileAnimationRange(utility: string): UtilityDeclaration | null {
  const match = /^animation-range(?:-(start|end))?-(.+)$/.exec(utility);
  if (!match) {
    return null;
  }
  const property = match[1] ? `animation-range-${match[1]}` : 'animation-range';
  const raw = match[2]!;
  const value = /^(normal|entry|exit|cover|contain)$/.test(raw) ? raw : arbitraryValue(raw);
  return value ? { property, value, atRule: RANGE_SUPPORT } : null;
}
