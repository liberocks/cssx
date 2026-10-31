import { readGeneratedClassNames } from '../atoms/read-generated-class-names';
import { selectLiveGeneratedClasses } from '../atoms/select-live-generated-classes';
import type { CssxTheme } from '../theme/theme';
import { structuralUtilityName } from '../utilities/registry/structural-utility-name';
import type { CompiledUtility } from '../utilities/registry/utility-recipe-types';
import { resolveUtilityRecipe } from '../utilities/values/resolve-utility-recipe';
import type { VariantOptions } from '../variants/apply-variants';
import { compileCandidate } from './compile-candidate';

/** Inputs required to compile one utility candidate. */
export interface CompileUtilityCandidateOptions {
  /** Utility candidate to compile. */
  readonly candidate: string;
  /** Allocates the class name used when the candidate is compiled. */
  readonly className: (candidate: string) => string;
  /** Resolved theme used by utility recipes and variants. */
  readonly theme: CssxTheme;
  /** Composite selectors associated with generated classes. */
  readonly selectorAliases: Readonly<Record<string, readonly string[]>>;
  /** Classes included in output, or undefined when all are included. */
  readonly includedClasses: ReadonlySet<string> | undefined;
  /** Options used while rendering candidate variants. */
  readonly variantOptions: VariantOptions;
  /** Whether allocated class names should be emitted as source selectors. */
  readonly escapeSourceSelectors: boolean;
}

/** Results from compiling one candidate before list-level aggregation. */
export interface CompiledUtilityCandidate {
  /** Generated class names joined into the runtime class value. */
  readonly className: string;
  /** Compiled candidate rules before ordering and deduplication. */
  readonly compiled: readonly CompiledUtility[];
  /** Keyframe names required by the compiled recipe. */
  readonly requiredKeyframes: ReadonlySet<string>;
  /** Custom properties required by the compiled recipe. */
  readonly requiredProperties: ReadonlySet<string>;
}

/**
 * Resolves one utility recipe and compiles it when it contributes live classes.
 *
 * @param options Candidate and rendering inputs.
 * @returns Generated class names, compiled rules, and recipe resources.
 */
export function compileUtilityCandidate(options: CompileUtilityCandidateOptions): CompiledUtilityCandidate {
  const { candidate, className, theme, selectorAliases, includedClasses, variantOptions, escapeSourceSelectors } =
    options;
  const resolvedRecipe = resolveUtilityRecipe(candidate, theme);
  const { recipe } = resolvedRecipe;
  if (recipe.atoms.length === 0) {
    return {
      className: structuralUtilityName(resolvedRecipe.semantics.group) ?? '',
      compiled: [],
      requiredKeyframes: new Set(),
      requiredProperties: new Set(),
    };
  }

  const generatedClasses = escapeSourceSelectors
    ? [className(candidate)]
    : readGeneratedClassNames(candidate, className(candidate));
  const compiledClassName = generatedClasses.join(' ');
  const liveClasses = selectLiveGeneratedClasses(generatedClasses, includedClasses, selectorAliases);
  if (liveClasses.length === 0) {
    return { className: compiledClassName, compiled: [], requiredKeyframes: new Set(), requiredProperties: new Set() };
  }

  return {
    className: compiledClassName,
    compiled: compileCandidate({
      candidateSource: candidate,
      classNames: generatedClasses,
      theme,
      atoms: recipe.atoms,
      candidate: resolvedRecipe.parsedCandidate,
      semanticGroup: resolvedRecipe.semantics.group,
      fallbackCss: recipe.fallbackCss,
      selectorAliases,
      includedClasses,
      variantOptions,
    }),
    requiredKeyframes: new Set(recipe.resources.keyframes),
    requiredProperties: new Set(recipe.resources.properties),
  };
}
