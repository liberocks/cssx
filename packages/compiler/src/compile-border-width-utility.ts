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
  const properties: Readonly<Record<string, readonly string[]>> = {
    x: ['border-left-width', 'border-right-width'],
    y: ['border-top-width', 'border-bottom-width'],
    t: ['border-top-width'],
    r: ['border-right-width'],
    b: ['border-bottom-width'],
    l: ['border-left-width'],
    s: ['border-inline-start-width'],
    e: ['border-inline-end-width'],
    bs: ['border-block-start-width'],
    be: ['border-block-end-width'],
  };
  return properties[side]!.map((property) => ({ property, value }));
}
