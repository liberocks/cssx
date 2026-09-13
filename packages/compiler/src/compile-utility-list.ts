import type { VariantOptions } from './apply-variants';
import { compileUtilityCandidates } from './compile-utility-candidates';
import { propertyRegistration } from './property-registration';
import { parseTheme, serializeThemeKeyframe, serializeThemeTokens } from './theme';
import type { UtilityCompilation } from './utility-recipe-types';

/**
 * Compiles utility candidates with either generated or source class selectors.
 *
 * @param candidates Utility candidates to compile.
 * @param className Creates class names for utility candidates.
 * @param themeCss Optional serialized theme CSS.
 * @param selectorAliases Composite classes that need separate selectors.
 * @param includedClasses Classes kept in the output, or undefined for all.
 * @param variantOptions Options that affect variant rendering.
 * @param escapeSourceSelectors Escapes source class selectors when true.
 * @returns The compiled CSS, class names, CSS entries, and keyframes.
 */
export async function compileUtilityList(
  candidates: readonly string[],
  className: (candidate: string) => string,
  themeCss: string,
  selectorAliases: Readonly<Record<string, readonly string[]>>,
  includedClasses: ReadonlySet<string> | undefined,
  variantOptions: VariantOptions,
  escapeSourceSelectors: boolean,
): Promise<UtilityCompilation> {
  if (candidates.length > 50_000) {
    throw new Error('CSSX supports at most 50,000 utility candidates per compilation.');
  }
  const theme = parseTheme(themeCss);
  const { classes, compiled, requiredKeyframes, requiredProperties } = compileUtilityCandidates({
    candidates,
    className,
    theme,
    selectorAliases,
    includedClasses,
    variantOptions,
    escapeSourceSelectors,
  });

  compiled.sort((left, right) => {
    if (left.order !== right.order) {
      return left.order < right.order ? -1 : 1;
    }
    return left.candidate < right.candidate ? -1 : 1;
  });
  const uniqueCompiled = [...new Map(compiled.map((entry) => [entry.css, entry] as const)).values()];
  const resources = `${[...requiredProperties].sort().map(propertyRegistration).join('')}${[...requiredKeyframes]
    .sort()
    .map((name) => serializeThemeKeyframe(theme, name))
    .filter((resource): resource is string => resource !== undefined)
    .join('')}`;
  const utilityCss = uniqueCompiled.map((entry) => entry.css).join('');
  const prefixCss = `${serializeThemeTokens(theme, `${resources}${utilityCss}`)}${resources}`;
  return {
    classes,
    prefixCss,
    entries: uniqueCompiled.map(({ candidate, css }) => ({ candidate, css })),
    css: `${prefixCss}${utilityCss}`,
  };
}
