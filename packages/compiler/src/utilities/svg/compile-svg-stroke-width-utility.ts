import type { UtilityDeclaration } from '../registry/utility-types';
import { resolveArbitraryCssValue } from '../values/utility-resolvers';

/**
 * Resolves SVG stroke width utilities.
 *
 * @param utility Utility name without variants.
 * @returns The stroke-width declaration, or null when unsupported.
 */
export function compileSvgStrokeWidthUtility(utility: string): UtilityDeclaration | null {
  const strokeWidth = /^stroke-(\d+|\[[^\]]+\])$/.exec(utility);
  if (!strokeWidth) {
    return null;
  }
  const raw = strokeWidth[1]!;
  return { property: 'stroke-width', value: raw.startsWith('[') ? resolveArbitraryCssValue(raw) : raw };
}
