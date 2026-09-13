import type { UtilityDeclaration } from './utility-types';

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
  return { property: 'stroke-width', value: raw.startsWith('[') ? raw.slice(1, -1) : raw };
}
