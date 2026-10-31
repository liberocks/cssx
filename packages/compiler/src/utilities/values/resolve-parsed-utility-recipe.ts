import type { ParsedCandidate } from '../../candidates/candidate';
import { compileDeclarations } from '../../compiler/compile-declarations';
import { requiredPropertyNames } from '../../css/required-property-names';
import { requiredAnimationKeyframes } from '../../shared/required-animation-keyframes';
import type { CssxTheme } from '../../theme/theme';
import { utilityFallback } from '../registry/fallback';
import { fallbackRecipe } from '../registry/fallback-recipe';
import type { UtilitySemantics } from '../registry/semantics';
import { structuralUtilityName } from '../registry/structural-utility-name';
import type { ResolvedUtilityRecipe } from '../registry/utility-recipe-types';
import type { UtilityDeclaration } from '../registry/utility-types';
import { atomizeDeclarations } from './utility-values';

/**
 * Builds a utility recipe from parsing and classification data already available to the caller.
 *
 * @param candidateSource Source utility candidate.
 * @param candidate Parsed utility candidate.
 * @param semantics Classification semantics for the candidate.
 * @param theme Active resolved theme.
 * @returns Recipe that serializes the candidate's CSS.
 */
export function resolveParsedUtilityRecipe(
  candidateSource: string,
  candidate: ParsedCandidate,
  semantics: UtilitySemantics,
  theme: CssxTheme,
): ResolvedUtilityRecipe {
  if (semantics && structuralUtilityName(semantics.group)) {
    return {
      recipe: {
        candidate: candidateSource,
        atoms: [],
        resources: { keyframes: [], properties: [] },
        writes: [],
      },
      parsedCandidate: candidate,
      semantics,
    };
  }
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
