import { candidateScope } from './candidate';
import type { ParsedCandidate } from './candidate';
import type { UtilitySemantics } from './semantics';
import type { ResolvedUtilityRecipe } from './utility-recipe-types';
import type { UtilityDeclaration } from './utility-types';

/**
 * Builds a CSSX recipe from checked-in fallback semantics.
 *
 * @param candidateSource Source utility candidate.
 * @param candidate Parsed utility candidate.
 * @param group Semantic group written by the candidate.
 * @param css Pinned fallback CSS to attach.
 * @returns Recipe that serializes the fallback rule.
 */
export function fallbackRecipe(
  candidateSource: string,
  candidate: ParsedCandidate,
  group: string,
  css: string,
): ResolvedUtilityRecipe {
  const semantics: UtilitySemantics = {
    scope: candidateScope(candidate),
    group,
    conflicts: [group],
  };
  const atoms = css
    ? [[{ property: '--cssx-fallback', value: 'initial', semanticGroup: group } satisfies UtilityDeclaration]]
    : [];
  return {
    recipe: {
      candidate: candidateSource,
      atoms,
      resources: { keyframes: [], properties: [] },
      writes: atoms.map(() => ({ group, conflicts: [group] })),
      ...(css ? { fallbackCss: css } : {}),
    },
    parsedCandidate: candidate,
    semantics,
  };
}