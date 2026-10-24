import type { UtilityCompilation } from '../utilities/registry/utility-recipe-types';
import type { VariantOptions } from '../variants/apply-variants';
import { compileUtilityList } from './compile-utility-list';

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
