import { parseCandidate } from './candidate';
import { classifyCandidate } from './semantics';
import { parseTheme, resolveThemeValue, serializeThemeKeyframe, serializeThemeTokens } from './theme';
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
import { SHORTHAND_WRITE_SETS } from './shorthand-write-sets';

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
  const keyframes = requiredAnimationKeyframes(declarations, theme);
  if (candidate.important) {
    for (const declaration of declarations) {
      declaration.value = `${declaration.value} !important`;
    }
  }
  const atoms = atomizeDeclarations(declarations);
  return {
    candidate: candidateSource,
    atoms,
    resources: { keyframes, properties: requiredPropertyNames(candidateSource) },
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
    (left, right) => left.order.localeCompare(right.order) || left.candidate.localeCompare(right.candidate),
  );
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
  const semantics = classifyCandidate(candidateSource)!;
  if (classNames.length === 1) {
    const declarations = atoms.flat();
    const generatedClass = classNames[0]!;
    const selectors = classSelectors(generatedClass, selectorAliases, includedClasses);
    return [
      {
        candidate: candidateSource,
        className: generatedClass,
        css: applyVariants(selectors, declarations, candidate.variants, theme),
        order: cssOrder(candidate, semantics.group, declarations),
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
        css: applyVariants(selectors, declarations, candidate.variants, theme),
        order: `${cssOrder(candidate, semantics.group, declarations)}\u0000${index}`,
      };
    })
    .filter((entry): entry is CompiledUtility => entry !== null);
}

/** Returns the required atomic selector and stable composite aliases. */
function classSelectors(
  className: string,
  selectorAliases: Readonly<Record<string, readonly string[]>>,
  includedClasses: ReadonlySet<string> | undefined,
): readonly string[] {
  const names = new Set(selectorAliases[className] ?? []);
  if (!includedClasses || includedClasses.has(className)) {
    names.add(className);
  }
  return [...names].sort().map((name) => `.${name}`);
}

/**
 * Explicit ordering for groups where broad declarations must precede narrow ones.
 *
 * The same order is used for all output so generated CSS remains deterministic
 * and directional utilities retain normal CSS cascade behavior after atomization.
 */
const CASCADE_GROUP_ORDER: Readonly<Record<string, number>> = {
  p: 100,
  px: 110,
  py: 110,
  pt: 120,
  pr: 120,
  pb: 120,
  pl: 120,
  ps: 120,
  pe: 120,
  m: 200,
  mx: 210,
  my: 210,
  mt: 220,
  mr: 220,
  mb: 220,
  ml: 220,
  ms: 220,
  me: 220,
  inset: 300,
  'inset-x': 310,
  'inset-y': 310,
  top: 320,
  right: 320,
  bottom: 320,
  left: 320,
  start: 320,
  end: 320,
  size: 400,
  width: 410,
  height: 410,
  'min-width': 410,
  'max-width': 410,
  'min-height': 410,
  'max-height': 410,
  gap: 500,
  'row-gap': 510,
  'column-gap': 510,
  border: 600,
  'border-width': 600,
  'border-x': 610,
  'border-y': 610,
  'border-top': 620,
  'border-right': 620,
  'border-bottom': 620,
  'border-left': 620,
};

/**
 * Builds a lexical sort key for variants, semantic groups, and atom position.
 *
 * @param candidate Parsed utility candidate.
 * @param group Semantic group written by the candidate.
 * @returns Stable CSS ordering key.
 */
function cssOrder(
  candidate: ReturnType<typeof parseCandidate>,
  group: string,
  declarations: readonly UtilityDeclaration[],
): string {
  const variantOrder = candidate.variants
    .map((variant) => {
      const known = ['sm', 'md', 'lg', 'xl', '2xl', 'dark', 'print'].indexOf(variant);
      return `${String(known === -1 ? 99 : known).padStart(2, '0')}:${variant}`;
    })
    .join(':');
  const groupOrder = String(CASCADE_GROUP_ORDER[group] ?? 900).padStart(3, '0');
  const properties = declarations.map((declaration) => declaration.property);
  const isController = properties.includes('transition-property') && properties.length > 1;
  const isShorthand = properties.some((property) => SHORTHAND_WRITE_SETS[property] !== undefined);
  const isEnhancement = properties.some(
    (property) =>
      property === 'animation-timeline' ||
      property.startsWith('animation-range') ||
      property.startsWith('scroll-timeline') ||
      property.startsWith('view-timeline') ||
      property === 'timeline-scope',
  );
  const isStartingStyle = candidate.variants.includes('starting');
  const isViewTransition = candidate.variants.some((variant) => variant.startsWith('vt-'));
  const phase = isViewTransition
    ? 500
    : isStartingStyle
      ? 400
      : isEnhancement
        ? 300
        : isShorthand || isController
          ? 100
          : 200;
  return `${String(phase).padStart(3, '0')}\u0000${variantOrder}\u0000${groupOrder}\u0000${group}`;
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

/**
 * Finds keyframe resources referenced by emitted animation declarations.
 *
 * @param declarations Compiled utility declarations.
 * @param theme Active resolved theme.
 * @returns Referenced keyframe names in stable order.
 */
function requiredAnimationKeyframes(declarations: readonly UtilityDeclaration[], theme: CssxTheme): readonly string[] {
  const required = new Set<string>();
  for (const declaration of declarations) {
    if (declaration.property === 'animation-name') {
      for (const name of declaration.value.split(',').map((part) => part.trim())) {
        if (theme.keyframes[name]) {
          required.add(name);
        }
      }
    } else if (declaration.property === 'animation') {
      const animationValue = resolveAnimationThemeReferences(declaration.value, theme);
      for (const name of Object.keys(theme.keyframes)) {
        const escapedName = name.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`(?:^|[\\s,])${escapedName}(?=$|[\\s,])`).test(animationValue)) {
          required.add(name);
        }
      }
    }
  }
  return [...required].sort();
}

/** Resolves theme variables in an animation declaration for resource discovery. */
function resolveAnimationThemeReferences(value: string, theme: CssxTheme): string {
  return value.replaceAll(/var\((--[a-z0-9_-]+)\)/gi, (reference, emittedName: string) => {
    const prefix = theme.prefix ? `--${theme.prefix}-` : '';
    const tokenName = prefix && emittedName.startsWith(prefix) ? `--${emittedName.slice(prefix.length)}` : emittedName;
    return resolveThemeValue(theme, tokenName) ?? reference;
  });
}

/**
 * Finds custom properties that need CSS property registration.
 *
 * @param candidateSource Source utility candidate.
 * @returns Required property names.
 */
function requiredPropertyNames(candidateSource: string): readonly string[] {
  const candidate = parseCandidate(candidateSource);
  const part = /^scrollbar-(thumb|track)-/.exec(candidate.utility)?.[1];
  return part ? [`--cssx-scrollbar-${part}`] : [];
}

/**
 * Creates the registration rule for a generated color custom property.
 *
 * @param name Custom-property name.
 * @returns CSS property registration rule.
 */
function propertyRegistration(name: string): string {
  return `@property ${name}{syntax:"<color>";inherits:true;initial-value:#0000;}`;
}
