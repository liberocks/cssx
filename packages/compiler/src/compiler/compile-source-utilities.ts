import { readGeneratedClassNames } from '../atoms/read-generated-class-names';
import type { UtilityCompilation } from '../utilities/registry/utility-recipe-types';
import type { VariantOptions } from '../variants/apply-variants';
import { compileUtilityList } from './compile-utility-list';

/**
 * Compiles utilities using their original source class names as selectors.
 *
 * @param candidates The utility strings to compile.
 * @param themeCss Optional CSS theme input.
 * @param variantOptions Options that affect variant rendering.
 * @param sourceClassNames Optional safe class selectors for source candidates.
 * @returns Generated CSS whose selectors match source names or supplied aliases.
 */
export async function compileSourceUtilities(
  candidates: readonly string[],
  themeCss = '',
  variantOptions: VariantOptions = {},
  sourceClassNames: Readonly<Record<string, string>> = {},
): Promise<UtilityCompilation> {
  const className = (candidate: string): string => {
    if (!Object.hasOwn(sourceClassNames, candidate)) {
      return candidate;
    }
    const sourceClassName = sourceClassNames[candidate]!;
    const classNames = readGeneratedClassNames(candidate, sourceClassName);
    if (classNames.length !== 1) {
      throw new Error(`CSSX source aliases must contain exactly one safe class name for utility "${candidate}".`);
    }
    return classNames[0]!;
  };
  return compileUtilityList(candidates, className, themeCss, {}, undefined, variantOptions, true);
}
