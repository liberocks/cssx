import type { ParsedCandidate } from './candidate-types';
import { containsUnsafeArbitrarySyntax } from './contains-unsafe-arbitrary-syntax';
import { containsUnsafeTopLevelSyntax } from './contains-unsafe-top-level-syntax';
import { normalizeCandidateVariants } from './normalize-candidate-variants';
import { splitTopLevel } from './split-top-level';

/**
 * Parses supported static candidate syntax and rejects CSS injection delimiters.
 *
 * @param raw Candidate source to validate and parse.
 * @returns Parsed candidate parts.
 */
export function parseCandidate(raw: string): ParsedCandidate {
  if (!raw || raw.length > 500) {
    throw new Error(`Invalid utility "${raw}".`);
  }
  const parts = splitTopLevel(raw, ':');
  const finalPart = parts.pop()!;

  let utility = finalPart;
  let important = false;
  let negative = false;
  if (utility.startsWith('!')) {
    important = true;
    utility = utility.slice(1);
  }
  if (utility.endsWith('!')) {
    if (important) {
      throw new Error(`Invalid utility "${raw}".`);
    }
    important = true;
    utility = utility.slice(0, -1);
  }
  if (utility.startsWith('-')) {
    negative = true;
    utility = utility.slice(1);
  }
  if (
    !utility ||
    utility.startsWith('!') ||
    utility.endsWith('!') ||
    containsUnsafeTopLevelSyntax(utility) ||
    containsUnsafeArbitrarySyntax(utility)
  ) {
    throw new Error(`Invalid utility "${raw}".`);
  }

  return { raw, variants: normalizeCandidateVariants(parts, raw), utility, important, negative };
}
