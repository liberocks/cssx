import { isBackgroundImageValue, isLengthArbitraryValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves arbitrary font-size and background-image forms in color utilities.
 *
 * @param family Color utility family parsed from the candidate.
 * @param value Candidate value without an opacity modifier.
 * @returns The typed arbitrary declaration, or null for ordinary colors.
 */
export function compileArbitraryColorUtility(family: string, value: string): UtilityDeclaration | null {
  if (family === 'text' && value.startsWith('[') && value.endsWith(']')) {
    const arbitrary = value.slice(1, -1);
    if (isLengthArbitraryValue(arbitrary)) {
      return { property: 'font-size', value: arbitrary.replace(/^(?:length|size):/, '') };
    }
  }
  if (family === 'bg' && value.startsWith('[') && value.endsWith(']')) {
    const arbitrary = value.slice(1, -1);
    if (isBackgroundImageValue(arbitrary)) {
      return { property: 'background-image', value: arbitrary.replace(/^image:/, '') };
    }
  }
  return null;
}
