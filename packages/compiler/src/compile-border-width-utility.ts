import { BORDER_WIDTH_PROPERTIES } from './border-width-properties';
import { isLengthCssValue, resolveArbitraryCssValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles directional border-width utilities.
 *
 * @param utility Utility name without variants.
 * @returns Border-width declarations, or null when unsupported.
 */
export function compileBorderWidthUtility(utility: string): UtilityDeclaration | UtilityDeclaration[] | null {
  const allSides = /^border-(\[[^\]]+\])$/.exec(utility);
  if (allSides) {
    const value = resolveArbitraryCssValue(allSides[1]!);
    if (!isLengthCssValue(value)) {
      return null;
    }
    return { property: 'border-width', value: value.replace(/^(?:length|size):/, '') };
  }
  const match = /^border-(x|y|t|r|b|l|s|e|bs|be)-(0|2|4|8)$/.exec(utility);
  if (!match) {
    return null;
  }
  const side = match[1]!;
  const value = `${match[2]!}px`.replace('0px', '0');
  return BORDER_WIDTH_PROPERTIES[side]!.map((property) => ({ property, value }));
}
