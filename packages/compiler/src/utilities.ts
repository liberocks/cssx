import type { ParsedCandidate } from './candidate';
import { classSelectors } from './class-selectors';
import { cssOrder } from './css-order';
import { describeUtilityRecipe } from './describe-utility-recipe';
import { getUtilityAtoms } from './get-utility-atoms';
import { propertyRegistration } from './property-registration';
import { readGeneratedClassNames } from './read-generated-class-names';
import { replaceFallbackSelector } from './replace-fallback-selector';
import { resolveParsedUtilityRecipe } from './resolve-parsed-utility-recipe';
import { resolveUtilityRecipe } from './resolve-utility-recipe';
import { parseTheme, serializeThemeKeyframe, serializeThemeTokens } from './theme';
import type { CssxTheme } from './theme';
import { applyVariants } from './utility-variants';
import type { VariantOptions } from './utility-variants';
import { validateUtilityCandidate } from './validate-utility-candidate';

import type {
  CompiledUtility,
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

/** Compiles utility candidates with either generated or source class selectors. */
async function compileUtilityList(
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
  const classes: Record<string, string> = Object.create(null) as Record<string, string>;
  const compiled: CompiledUtility[] = [];
  const requiredKeyframes = new Set<string>();
  const requiredProperties = new Set<string>();

  for (const candidate of [...new Set(candidates)]) {
    const resolvedRecipe = resolveUtilityRecipe(candidate, theme);
    const { recipe } = resolvedRecipe;
    if (recipe.atoms.length === 0) {
      classes[candidate] = '';
      continue;
    }
    const generatedClasses = escapeSourceSelectors
      ? [className(candidate)]
      : readGeneratedClassNames(candidate, className(candidate));
    classes[candidate] = generatedClasses.join(' ');
    const liveClasses = includedClasses
      ? generatedClasses.filter(
          (generatedClass) => includedClasses.has(generatedClass) || (selectorAliases[generatedClass]?.length ?? 0) > 0,
        )
      : generatedClasses;
    if (liveClasses.length === 0) {
      continue;
    }
    compiled.push(
      ...compileCandidate(
        candidate,
        generatedClasses,
        theme,
        recipe.atoms,
        resolvedRecipe.parsedCandidate,
        resolvedRecipe.semantics.group,
        recipe.fallbackCss,
        selectorAliases,
        includedClasses,
        variantOptions,
      ),
    );
    for (const keyframe of recipe.resources.keyframes) {
      requiredKeyframes.add(keyframe);
    }
    for (const property of recipe.resources.properties) {
      requiredProperties.add(property);
    }
  }

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

/**
 * Compiles one candidate into one rule or atomized rules for supplied classes.
 *
 * @param candidateSource Source utility candidate.
 * @param classNames Generated classes assigned to the candidate.
 * @param theme Active resolved theme.
 * @param atoms Declaration atoms to render.
 * @returns Ordered CSS entries for the candidate.
 */
function compileCandidate(
  candidateSource: string,
  classNames: readonly string[],
  theme: CssxTheme,
  atoms: readonly (readonly UtilityDeclaration[])[],
  candidate: ParsedCandidate,
  semanticGroup: string,
  fallbackCss: string | undefined,
  selectorAliases: Readonly<Record<string, readonly string[]>>,
  includedClasses: ReadonlySet<string> | undefined,
  variantOptions: VariantOptions,
): readonly CompiledUtility[] {
  if (fallbackCss !== undefined) {
    if (classNames.length !== 1) {
      throw new Error(`CSSX expected one generated class for fallback utility "${candidateSource}".`);
    }
    const selectors = classSelectors(classNames[0]!, selectorAliases, includedClasses);
    return [
      {
        candidate: candidateSource,
        className: classNames[0]!,
        css: selectors.map((selector) => replaceFallbackSelector(fallbackCss, candidateSource, selector)).join(''),
        order: cssOrder(candidate, semanticGroup, atoms.flat()),
      },
    ];
  }
  if (classNames.length === 1) {
    const declarations = atoms.length === 1 ? atoms[0]! : atoms.flat();
    const generatedClass = classNames[0]!;
    const selectors = classSelectors(generatedClass, selectorAliases, includedClasses);
    return [
      {
        candidate: candidateSource,
        className: generatedClass,
        css: applyVariants(selectors, declarations, candidate.variants, theme, variantOptions),
        order: cssOrder(candidate, semanticGroup, declarations),
      },
    ];
  }
  if (classNames.length !== atoms.length) {
    throw new Error(`CSSX expected ${atoms.length} generated classes for utility "${candidateSource}".`);
  }
  return atoms
    .map((declarations, index) => {
      const className = classNames[index]!;
      const selectors = classSelectors(className, selectorAliases, includedClasses);
      if (selectors.length === 0) {
        return null;
      }
      return {
        candidate: candidateSource,
        className,
        css: applyVariants(selectors, declarations, candidate.variants, theme, variantOptions),
        order: `${cssOrder(candidate, semanticGroup, declarations)}\u0000${index}`,
      };
    })
    .filter((entry): entry is CompiledUtility => entry !== null);
}
