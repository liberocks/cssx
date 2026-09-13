import { candidateScope, parseCandidate } from './candidate';
import type { ParsedCandidate } from './candidate';
import { classSelectors } from './class-selectors';
import { cssOrder } from './css-order';
import { utilityFallback } from './fallback';
import { fallbackRecipe } from './fallback-recipe';
import { propertyRegistration } from './property-registration';
import { readGeneratedClassNames } from './read-generated-class-names';
import { replaceFallbackSelector } from './replace-fallback-selector';
import { requiredAnimationKeyframes } from './required-animation-keyframes';
import { requiredPropertyNames } from './required-property-names';
import { resolveAnimationThemeReferences } from './resolve-animation-theme-references';
import { classifyParsedCandidate } from './semantics';
import type { UtilitySemantics } from './semantics';
import { parseTheme, resolveThemeValue, serializeThemeKeyframe, serializeThemeTokens } from './theme';
import type { CssxTheme } from './theme';
import {
  compileDivideUtility,
  compileOutlineUtility,
  compilePlaceholderUtility,
  compileSpaceUtility,
} from './utility-box-model';
import { EXACT_DECLARATIONS } from './utility-exact-declarations';
import { compileContainerUtility, compileCoreLayoutUtility } from './utility-layout';
import { compilePrefixedUtility } from './utility-prefixed';
import { compileArbitraryProperty } from './utility-transform';
import type { UtilityDeclaration } from './utility-types';
import { compileFontSizeUtility } from './utility-typography';
import { atomizeDeclarations, cloneDeclarations } from './utility-values';
import { applyVariants } from './utility-variants';
import type { VariantOptions } from './utility-variants';

export type { UtilityDeclaration } from './utility-types';

/** CSS and metadata created from utility strings. */
export interface UtilityCompilation {
  /** Complete generated CSS, including prefix CSS. */
  readonly css: string;
  /** Theme CSS and shared CSS resources. */
  readonly prefixCss: string;
  /** Utility CSS entries in output order. */
  readonly entries: readonly UtilityCssEntry[];
  /** Generated class string keyed by source candidate. */
  readonly classes: Readonly<Record<string, string>>;
}

/** One utility string and its generated CSS. */
export interface UtilityCssEntry {
  /** Source utility candidate. */
  readonly candidate: string;
  /** CSS emitted for this candidate and one generated class. */
  readonly css: string;
}

/** Shared CSS resources needed by a utility. */
export interface UtilityRecipeResources {
  /** Keyframe names required by the utility. */
  readonly keyframes: readonly string[];
  /** Custom properties that must be registered before emitting CSS. */
  readonly properties: readonly string[];
}

/** Style groups written by one utility part. */
export interface UtilityWriteSet {
  /** Semantic group written by this atom. */
  readonly group: string;
  /** Semantic groups cleared by this atom. */
  readonly conflicts: readonly string[];
}

/** The compiled parts and metadata for one utility. */
export interface UtilityRecipe {
  /** Source utility candidate. */
  readonly candidate: string;
  /** Separate declaration atoms that can receive separate class names. */
  readonly atoms: readonly (readonly UtilityDeclaration[])[];
  /** Shared CSS resources required by the utility. */
  readonly resources: UtilityRecipeResources;
  /** Semantic write behavior for each declaration atom. */
  readonly writes: readonly UtilityWriteSet[];
  /** Precomputed CSS for a data-backed recipe, if one is required. */
  readonly fallbackCss?: string;
}

/** Internal CSS entry before final ordering and result projection. */
interface CompiledUtility {
  /** Source utility candidate. */
  readonly candidate: string;
  /** Generated class name for this atom. */
  readonly className: string;
  /** CSS emitted for this atom. */
  readonly css: string;
  /** Stable cascade sort key. */
  readonly order: string;
}

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

/** Internal parsed and classified recipe data reused during CSS serialization. */
export interface ResolvedUtilityRecipe {
  readonly recipe: UtilityRecipe;
  readonly parsedCandidate: ParsedCandidate;
  readonly semantics: UtilitySemantics;
}

/** Resolves a utility once for both recipe construction and CSS serialization. */
export function resolveUtilityRecipe(candidateSource: string, theme: CssxTheme): ResolvedUtilityRecipe {
  const candidate = parseCandidate(candidateSource);
  const semantics = classifyParsedCandidate(candidate);
  if (!semantics) {
    throw new Error(`CSSX cannot compile utility "${candidateSource}".`);
  }
  return resolveParsedUtilityRecipe(candidateSource, candidate, semantics, theme);
}

/** Builds a utility recipe from parsing and classification data already available to the caller. */
export function resolveParsedUtilityRecipe(
  candidateSource: string,
  candidate: ParsedCandidate,
  semantics: UtilitySemantics,
  theme: CssxTheme,
): ResolvedUtilityRecipe {
  const fallback = utilityFallback(candidateSource);
  let declarations: UtilityDeclaration[];
  try {
    declarations = compileDeclarations(candidate.utility, candidate.negative, theme);
  } catch (error) {
    if (!fallback) {
      throw error;
    }
    return fallbackRecipe(candidateSource, candidate, fallback.group, fallback.css);
  }
  const keyframes = requiredAnimationKeyframes(declarations, theme);
  if (candidate.important) {
    for (const declaration of declarations) {
      declaration.value = `${declaration.value} !important`;
    }
  }
  const atoms = atomizeDeclarations(declarations);
  return {
    recipe: {
      candidate: candidateSource,
      atoms,
      resources: { keyframes, properties: requiredPropertyNames(candidate.utility) },
      writes: atoms.map((atom) => {
        const group = atom[0]?.semanticGroup ?? semantics.group;
        return { group, conflicts: atom[0]?.semanticConflicts ?? [group] };
      }),
    },
    parsedCandidate: candidate,
    semantics,
  };
}

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
 * Checks that a utility has CSS for the active theme.
 *
 * @param candidate A static utility string.
 * @param theme The active CSSX theme.
 * @returns Nothing.
 */
export function validateUtilityCandidate(candidate: string, theme: CssxTheme): void {
  getUtilityAtoms(candidate, theme);
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

/**
 * Resolves one utility name through exact declarations and compiler families.
 *
 * @param utility Utility name without variants or modifiers.
 * @param negative Whether the candidate uses negative value syntax.
 * @param theme Active resolved theme.
 * @returns Mutable declarations for the utility.
 */
function compileDeclarations(utility: string, negative: boolean, theme: CssxTheme): UtilityDeclaration[] {
  const fontSize = compileFontSizeUtility(utility, theme);
  if (fontSize) {
    return fontSize;
  }
  const exact = EXACT_DECLARATIONS[utility];
  if (exact) {
    return cloneDeclarations(exact);
  }
  if (utility.startsWith('[') && utility.endsWith(']')) {
    return [compileArbitraryProperty(utility)];
  }

  const space = compileSpaceUtility(utility, negative, theme);
  if (space) {
    return space;
  }
  const divide = compileDivideUtility(utility, theme);
  if (divide) {
    return divide;
  }
  const placeholder = compilePlaceholderUtility(utility, theme);
  if (placeholder) {
    return placeholder;
  }
  const outline = compileOutlineUtility(utility, negative, theme);
  if (outline) {
    return outline;
  }
  const container = compileContainerUtility(utility, theme);
  if (container) {
    return container;
  }
  const layout = compileCoreLayoutUtility(utility, negative, theme);
  if (layout) {
    return Array.isArray(layout) ? layout : [layout];
  }
  const declaration = compilePrefixedUtility(utility, negative, theme);
  if (!declaration) {
    throw new Error(`CSSX cannot compile utility "${negative ? '-' : ''}${utility}".`);
  }
  return Array.isArray(declaration) ? declaration : [declaration];
}
