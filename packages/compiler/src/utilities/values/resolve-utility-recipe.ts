import { parseCandidate } from '../../candidates/candidate';
import type { CssxTheme } from '../../theme/theme';
import { classifyParsedCandidate } from '../registry/semantics';
import type { ResolvedUtilityRecipe } from '../registry/utility-recipe-types';
import { resolveParsedUtilityRecipe } from './resolve-parsed-utility-recipe';

/**
 * Resolves a utility once for both recipe construction and CSS serialization.
 *
 * @param candidateSource Source utility candidate.
 * @param theme Active resolved theme.
 * @returns Recipe that serializes the candidate's CSS.
 */
export function resolveUtilityRecipe(candidateSource: string, theme: CssxTheme): ResolvedUtilityRecipe {
  const candidate = parseCandidate(candidateSource);
  const semantics = classifyParsedCandidate(candidate);
  if (!semantics) {
    throw new Error(`CSSX cannot compile utility "${candidateSource}".`);
  }
  return resolveParsedUtilityRecipe(candidateSource, candidate, semantics, theme);
}
