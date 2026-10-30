import { parseCandidate } from '../../candidates/candidate';
import { classifyCandidate } from './semantics';
import { PREFIX_GROUPS } from './semantics-prefix-groups';
import { formattingCategory } from './utility-formatting-category';

/** Formatting ranks and conservative conflict domains for a CSSX utility. */
export interface UtilityFormattingMetadata {
  /** Semantic category used for canonical utility ordering. */
  readonly categoryRank: number;
  /** Registered utility family order, or a stable lexical fallback. */
  readonly familyRank: number;
  /** Normalized variant and importance scope used by CSSX conflict resolution. */
  readonly variantScope: string;
  /** Normalized variants in CSSX order. */
  readonly variants: readonly string[];
  /** Conservative property-write domains, including directional conflicts. */
  readonly writeDomains: readonly string[];
  /** Semantic utility group. */
  readonly group: string;
}

/** Orders broad sizing families before narrower min/max families. */
const FAMILY_RANK_OVERRIDES: Readonly<Record<string, number>> = {
  width: 0,
  'inline-size': 1,
  'min-width': 2,
  'max-width': 3,
  height: 4,
  'block-size': 5,
  'min-height': 6,
  'max-height': 7,
  size: 8,
  'aspect-ratio': 9,
};

/** First registry position for every utility family. */
const registeredFamilyRanks = new Map<string, number>();
for (const [index, [, group]] of PREFIX_GROUPS.entries()) {
  if (!registeredFamilyRanks.has(group)) {
    registeredFamilyRanks.set(group, index);
  }
}

/**
 * Describes one supported candidate for safe, canonical source formatting.
 *
 * @param source Static CSSX utility candidate.
 * @returns Formatting metadata, or null for unknown and ambiguous utilities.
 */
export function describeUtilityFormatting(source: string): UtilityFormattingMetadata | null {
  try {
    const candidate = parseCandidate(source);
    const semantics = classifyCandidate(source);
    if (!semantics) {
      return null;
    }

    const categoryRank = formattingCategory(semantics.group);
    if (categoryRank === null) {
      return null;
    }

    return {
      categoryRank,
      familyRank:
        FAMILY_RANK_OVERRIDES[semantics.group] ?? registeredFamilyRanks.get(semantics.group) ?? Number.MAX_SAFE_INTEGER,
      variantScope: semantics.scope,
      variants: candidate.variants,
      writeDomains: [...new Set([semantics.group, ...semantics.conflicts])],
      group: semantics.group,
    };
  } catch {
    return null;
  }
}
