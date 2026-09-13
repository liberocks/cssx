import type { ParsedCandidate } from './candidate';
import { compileDeclarations } from './compile-declarations';
import { utilityFallback } from './fallback';
import { fallbackRecipe } from './fallback-recipe';
import { requiredAnimationKeyframes } from './required-animation-keyframes';
import { requiredPropertyNames } from './required-property-names';
import type { UtilitySemantics } from './semantics';
import type { CssxTheme } from './theme';
import type { ResolvedUtilityRecipe } from './utility-recipe-types';
import type { UtilityDeclaration } from './utility-types';
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