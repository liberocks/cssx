import { resolveUtilityRecipe } from './resolve-utility-recipe';
import type { CssxTheme } from './theme';
import type { UtilityRecipe } from './utility-recipe-types';

/**
 * Describes the CSS created for one utility.
 *
 * @param candidateSource A static utility string.
 * @param theme The active CSSX theme.
 * @returns Its CSS declaration groups, resources, and style groups.
 */
export function describeUtilityRecipe(candidateSource: string, theme: CssxTheme): UtilityRecipe {
  return resolveUtilityRecipe(candidateSource, theme).recipe;
}