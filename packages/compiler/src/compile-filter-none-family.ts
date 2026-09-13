import { filterNoneDeclarations } from './filter-none-declarations';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves a filter-family reset utility and its conflict channels.
 *
 * @param utility Utility name within the family.
 * @param property Target CSS filter property.
 * @param semanticPrefix Prefix for the family semantic groups.
 * @returns Reset declarations, or null when the utility is not a reset.
 */
export function compileFilterNoneFamily(
  utility: string,
  property: 'filter' | 'backdrop-filter',
  semanticPrefix: string,
): UtilityDeclaration[] | null {
  if (utility !== 'filter-none') {
    return null;
  }
  const semanticGroup = `${semanticPrefix}filter-none`;
  const channels = [
    'filter-none',
    'blur',
    'brightness',
    'contrast',
    'drop-shadow',
    'grayscale',
    'hue-rotate',
    'invert',
    'opacity',
    'saturate',
    'sepia',
  ].map((channel) => `${semanticPrefix}${channel}`);
  return filterNoneDeclarations(property, semanticGroup, channels);
}
