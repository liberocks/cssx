import type { VariantOptions } from './apply-variants';
import { compileUtilityList } from './compile-utility-list';
import type { UtilityCompilation } from './utility-recipe-types';

/**
 * Compiles static utility strings to CSS.
 *
 * @param candidates The utility strings to compile.
 * @param className Creates class names for utility strings.
 * @param themeCss Optional CSS theme input.
 * @param selectorAliases Composite classes that need separate selectors.
 * @param includedClasses Classes kept in the output, or undefined for all.
 * @param variantOptions Options that affect variant rendering.
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
