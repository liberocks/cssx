import type { VariantOptions } from './apply-variants';
import { compileCandidate } from './compile-candidate';
import { readGeneratedClassNames } from './read-generated-class-names';
import { resolveUtilityRecipe } from './resolve-utility-recipe';
import type { CssxTheme } from './theme';
import type { CompiledUtility } from './utility-recipe-types';

/** Inputs required to compile a deduplicated list of utility candidates. */
export interface CompileUtilityCandidatesOptions {
  /** Candidate utilities to compile. */
  readonly candidates: readonly string[];
  /** Allocates the class name used when a candidate is compiled. */
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

/** Per-candidate results consumed by the stylesheet assembly phase. */
export interface CompiledUtilityCandidates {
  /** Generated class names keyed by source candidate. */
  readonly classes: Readonly<Record<string, string>>;
  /** Compiled candidate rules before ordering and deduplication. */
  readonly compiled: CompiledUtility[];
  /** Keyframe names required by compiled recipes. */
  readonly requiredKeyframes: ReadonlySet<string>;
  /** Custom properties required by compiled recipes. */
  readonly requiredProperties: ReadonlySet<string>;
}

/**
 * Resolves and compiles each unique utility while collecting its shared resources.
 *
 * @param options Candidate and rendering inputs for this compilation phase.
 * @returns Generated class names, compiled rules, and shared CSS resources.
 */
export function compileUtilityCandidates(options: CompileUtilityCandidatesOptions): CompiledUtilityCandidates {
  const { candidates, className, theme, selectorAliases, includedClasses, variantOptions, escapeSourceSelectors } =
    options;
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
      ...compileCandidate({
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
    );
    for (const keyframe of recipe.resources.keyframes) {
      requiredKeyframes.add(keyframe);
    }
    for (const property of recipe.resources.properties) {
      requiredProperties.add(property);
    }
  }

  return { classes, compiled, requiredKeyframes, requiredProperties };
}
