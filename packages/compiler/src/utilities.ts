import { parseCandidate } from './candidate';
import { classifyCandidate } from './semantics';
import { parseTheme, serializeThemeTokens } from './theme';
import type { UtilityDeclaration } from './utility-types';
import { atomizeDeclarations, cloneDeclarations } from './utility-values';
import { applyVariants } from './utility-variants';
import { EXACT_DECLARATIONS } from './utility-exact-declarations';
import { compileArbitraryProperty } from './utility-transform';
import {
  compileDivideUtility,
  compileOutlineUtility,
  compilePlaceholderUtility,
  compileSpaceUtility,
} from './utility-box-model';
import { compileContainerUtility, compileCoreLayoutUtility } from './utility-layout';
import { compilePrefixedUtility } from './utility-prefixed';

export type { UtilityDeclaration } from './utility-types';
import type { CssxTheme } from './theme';

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
  const candidate = parseCandidate(candidateSource);
  const semantics = classifyCandidate(candidateSource);
  if (!semantics) {
    throw new Error(`CSSX cannot compile utility "${candidateSource}".`);
  }
  const declarations = compileDeclarations(candidate.utility, candidate.negative, theme);
  if (candidate.important) {
    for (const declaration of declarations) {
      declaration.value = `${declaration.value} !important`;
    }
  }
  const atoms = atomizeDeclarations(declarations);
  const keyframeName = animationKeyframeName(candidateSource);
  return {
    candidate: candidateSource,
    atoms,
    resources: { keyframes: keyframeName ? [keyframeName] : [], properties: requiredPropertyNames(candidateSource) },
    writes: atoms.map((atom) => {
      const group = atom[0]?.semanticGroup ?? semantics.group;
      return { group, conflicts: atom[0]?.semanticConflicts ?? [group] };
    }),
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
    const recipe = describeUtilityRecipe(candidate, theme);
    const generatedClasses = readGeneratedClassNames(candidate, className(candidate));
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
      ...compileCandidate(candidate, generatedClasses, theme, recipe.atoms, selectorAliases, includedClasses),
    );
    for (const keyframe of recipe.resources.keyframes) {
      requiredKeyframes.add(keyframe);
    }
    for (const property of recipe.resources.properties) {
      requiredProperties.add(property);
    }
  }

  compiled.sort(
    (left, right) => left.order.localeCompare(right.order) || left.className.localeCompare(right.className),
  );
  const uniqueCompiled = [...new Map(compiled.map((entry) => [entry.css, entry] as const)).values()];
  const resources = `${[...requiredProperties].sort().map(propertyRegistration).join('')}${[...requiredKeyframes]
    .sort()
    .map((name) => theme.keyframes[name])
    .filter((resource): resource is string => resource !== undefined)
    .join('')}`;
  const utilityCss = uniqueCompiled.map((entry) => entry.css).join('');
  const prefixCss = `${serializeThemeTokens(theme, utilityCss)}${resources}`;
  return {
    classes,
    prefixCss,
    entries: uniqueCompiled.map(({ candidate, css }) => ({ candidate, css })),
    css: `${prefixCss}${utilityCss}`,
  };
}

/**
 * Validates a callback result and splits it into generated class names.
 *
 * @param candidate Source utility candidate.
 * @param value Class string returned by the caller callback.
 * @returns Safe non-empty class names.
 */
function readGeneratedClassNames(candidate: string, value: string): readonly string[] {
  const classes = value.split(/\s+/).filter(Boolean);
  if (classes.length === 0 || classes.some((className) => !/^[A-Za-z_-][A-Za-z0-9_-]*$/.test(className))) {
    throw new Error(`CSSX received an unsafe generated class name for utility "${candidate}".`);
  }
  return classes;
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
  selectorAliases: Readonly<Record<string, readonly string[]>>,
  includedClasses: ReadonlySet<string> | undefined,
): readonly CompiledUtility[] {
  const candidate = parseCandidate(candidateSource);
  const semantics = classifyCandidate(candidateSource);
  if (!semantics) {
    throw new Error(`CSSX cannot compile utility "${candidateSource}".`);
  }
  if (classNames.length === 1) {
    const declarations = atoms.flat();
    const generatedClass = classNames[0] ?? '';
    const selectors = classSelectors(generatedClass, selectorAliases, includedClasses);
    if (selectors.length === 0) {
      return [];
    }
    return [
      {
        candidate: candidateSource,
        className: generatedClass,
        css: applyVariants(selectors, declarations, candidate.variants, theme),
        order: cssOrder(candidate, semantics.group),
      },
    ];
  }
  if (classNames.length !== atoms.length) {
    throw new Error(`CSSX expected ${atoms.length} generated classes for utility "${candidateSource}".`);
  }
  return atoms
    .map((declarations, index) => {
      const className = classNames[index] ?? '';
      const selectors = classSelectors(className, selectorAliases, includedClasses);
      if (selectors.length === 0) {
        return null;
