import { compileUtilityList } from './compile-utility-list';
import { describeUtilityRecipe } from './describe-utility-recipe';
import { getUtilityAtoms } from './get-utility-atoms';
import { resolveParsedUtilityRecipe } from './resolve-parsed-utility-recipe';
import { resolveUtilityRecipe } from './resolve-utility-recipe';
import type { VariantOptions } from './utility-variants';
import { validateUtilityCandidate } from './validate-utility-candidate';

import type {
  ResolvedUtilityRecipe,
  UtilityCompilation,
  UtilityCssEntry,
  UtilityRecipe,
  UtilityRecipeResources,
  UtilityWriteSet,
} from './utility-recipe-types';
import type { UtilityDeclaration } from './utility-types';

export type {
  UtilityCompilation,
  UtilityCssEntry,
  UtilityRecipe,
  UtilityRecipeResources,
  UtilityWriteSet,
  ResolvedUtilityRecipe,
};
export {
  getUtilityAtoms,
  describeUtilityRecipe,
  resolveParsedUtilityRecipe,
  resolveUtilityRecipe,
  validateUtilityCandidate,
};
export type { UtilityDeclaration };

/**
 * Compiles static utility strings to CSS.
 *
 * @param candidates The utility strings to compile.
 * @param className Creates class names for utility strings.
 * @param themeCss Optional CSS theme input.
 * @returns The generated CSS, class names, and CSS entries.
 *
 * The function rejects unsupported utilities, unsafe class names, and more
 * than 50,000 utility strings.
 */
export async function compileUtilities(
  candidates: readonly string[],
  className: (candidate: string) => string,
  themeCss = '',
  selectorAliases: Readonly<Record<string, readonly string[]>> = {},
  includedClasses?: ReadonlySet<string>,
  variantOptions: VariantOptions = {},
): Promise<UtilityCompilation> {
  return compileUtilityList(candidates, className, themeCss, selectorAliases, includedClasses, variantOptions, false);
}

/**
 * Compiles utilities using their original source class names as selectors.
 *
 * @param candidates The utility strings to compile.
 * @param themeCss Optional CSS theme input.
 * @param variantOptions Options that affect variant rendering.
 * @returns Generated CSS whose selectors match the source utility strings.
 */
export async function compileSourceUtilities(
  candidates: readonly string[],
  themeCss = '',
  variantOptions: VariantOptions = {},
): Promise<UtilityCompilation> {
  return compileUtilityList(candidates, (candidate) => candidate, themeCss, {}, undefined, variantOptions, true);
}
