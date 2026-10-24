import type { CssxTheme } from '../theme/theme';
import { describeUtilityRecipe } from '../utilities/registry/describe-utility-recipe';
import type { UtilityDeclaration } from '../utilities/registry/utility-types';

/**
 * Gets the CSS declaration groups for one utility.
 *
 * @param candidateSource A static utility string.
 * @param theme The active CSSX theme.
 * @returns CSS declaration groups that can be merged separately.
 */
export function getUtilityAtoms(candidateSource: string, theme: CssxTheme): readonly (readonly UtilityDeclaration[])[] {
  return describeUtilityRecipe(candidateSource, theme).atoms;
}
