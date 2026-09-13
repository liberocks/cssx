import { parseCandidate } from './candidate';
import { resolveParsedUtilityRecipe } from './resolve-parsed-utility-recipe';
import { classifyParsedCandidate } from './semantics';
import type { CssxTheme } from './theme';
import type { ResolvedUtilityRecipe } from './utility-recipe-types';

/** Resolves a utility once for both recipe construction and CSS serialization. */
export function resolveUtilityRecipe(candidateSource: string, theme: CssxTheme): ResolvedUtilityRecipe {
  const candidate = parseCandidate(candidateSource);
  const semantics = classifyParsedCandidate(candidate);
  if (!semantics) {
    throw new Error(`CSSX cannot compile utility "${candidateSource}".`);
  }
  return resolveParsedUtilityRecipe(candidateSource, candidate, semantics, theme);
}