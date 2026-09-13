export { candidateScope } from './candidate-scope';
export { splitCandidateList } from './split-candidate-list';
import { splitTopLevel } from './split-top-level';
import { containsUnsafeTopLevelSyntax } from './contains-unsafe-top-level-syntax';
import { containsUnsafeArbitrarySyntax } from './contains-unsafe-arbitrary-syntax';
import { normalizeCandidateVariants } from './normalize-candidate-variants';

/** Parsed parts of one supported static utility candidate. */
export interface ParsedCandidate {
  /** Original unmodified candidate string. */
  readonly raw: string;
  /** Ordered selector and responsive variants. */
  readonly variants: readonly string[];
  /** Utility name without variants, importance, or negation. */
  readonly utility: string;
  /** Whether declarations must use `!important`. */
  readonly important: boolean;
  /** Whether the utility value is negative. */
  readonly negative: boolean;
}

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

  const variants = normalizeCandidateVariants(parts, raw);
  return { raw, variants, utility, important, negative };
}
