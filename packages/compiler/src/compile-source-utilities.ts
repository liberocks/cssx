import { compileUtilityList } from './compile-utility-list';
import type { UtilityCompilation } from './utility-recipe-types';
import type { VariantOptions } from './utility-variants';

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
