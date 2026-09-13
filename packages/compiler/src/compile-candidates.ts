import { atomSemantics } from './atom-semantics';
import { parseCandidate } from './parse-candidate';
import { classifyParsedCandidate } from './semantics';
import type { parseTheme } from './theme-parser';
import type { getUtilityAtoms } from './utilities';
import { resolveParsedUtilityRecipe } from './utilities';
import type { UtilityConflictRecord } from './utility-conflict-record';

/** Reusable candidate data shared by naming and static conflict-record generation. */
export interface CompiledCandidate {
  readonly classification: UtilityConflictRecord;
  readonly atoms: ReturnType<typeof getUtilityAtoms>;
  readonly atomSemantics: readonly UtilityConflictRecord[];
}

/**
 * Resolves each distinct candidate once for the current compilation theme.
 *
 * @param candidates Utility candidates to resolve.
 * @param theme Parsed theme used when building utility recipes.
 * @returns Compiled candidate data keyed by candidate string.
 */
export function compileCandidates(
  candidates: readonly string[],
  theme: ReturnType<typeof parseTheme>,
): ReadonlyMap<string, CompiledCandidate> {
  const compiled = new Map<string, CompiledCandidate>();
  for (const candidate of new Set(candidates)) {
    const parsedCandidate = parseCandidate(candidate);
    const classification = classifyParsedCandidate(parsedCandidate);
    if (!classification) {
      throw new Error(`CSSX cannot classify utility "${candidate}" for composition.`);
    }
    const { recipe } = resolveParsedUtilityRecipe(candidate, parsedCandidate, classification, theme);
    compiled.set(candidate, {
      classification,
      atoms: recipe.atoms,
      atomSemantics: recipe.atoms.map((atom) => atomSemantics(atom, classification)),
    });
  }
  return compiled;
}
