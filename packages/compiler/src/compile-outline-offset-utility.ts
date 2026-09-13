import { resolveBorderWidthValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves a numbered or arbitrary outline offset, including its sign.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the candidate is negative.
 * @returns The offset declaration, or null when another recipe applies.
 */
export function compileOutlineOffsetUtility(utility: string, negative: boolean): UtilityDeclaration | null {
  const match = /^outline-offset-(.+)$/.exec(utility);
  if (!match) {
    return null;
  }
  const raw = match[1]!;
  // Numbered outline offsets are literal pixels, not spacing units.
  const value = raw === '1' ? '1px' : resolveBorderWidthValue(raw);
  if (!value) {
    return null;
  }
  const offsetValue =
    negative && value !== '0'
      ? value.startsWith('var(') || value.startsWith('calc(')
        ? `calc(${value} * -1)`
        : `-${value}`
      : value;
  return { property: 'outline-offset', value: offsetValue };
}
