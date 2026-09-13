import { splitCandidateList } from './candidate';
import { MAX_STYLE_MAP_ENTRIES, MAX_CANDIDATE_COUNT } from './candidate-limits';

/** Utility candidates grouped by style-map name and style name. */
export type StyleMapCandidates = Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;

/** Parsed style candidates together with the flattened compiler input. */
export interface CollectedStyleMapCandidates {
  /** Candidate lists keyed by map name, then style name. */
  readonly byMap: StyleMapCandidates;
  /** Every candidate in source order, including repeated uses. */
  readonly all: readonly string[];
}

/**
 * Splits the utility strings in named style maps and enforces input limits.
 *
 * @param inputs Map names and their static style utility maps.
 * @returns Per-style candidates and the flattened compiler input.
 * @throws When a map or the full candidate list exceeds its supported limit.
 */
export function collectStyleMapCandidates(
  inputs: Readonly<Record<string, Readonly<Record<string, string>>>>,
): CollectedStyleMapCandidates {
  const byMap: Record<string, Readonly<Record<string, readonly string[]>>> = Object.create(null) as Record<
    string,
    Readonly<Record<string, readonly string[]>>
  >;
  for (const [mapName, input] of Object.entries(inputs)) {
    if (Object.keys(input).length > MAX_STYLE_MAP_ENTRIES) {
      throw new Error(`CSSX style maps support at most ${MAX_STYLE_MAP_ENTRIES} entries.`);
    }
    const candidates: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
    for (const [name, source] of Object.entries(input)) {
      candidates[name] = splitCandidateList(source);
    }
    byMap[mapName] = candidates;
  }

  const all = Object.values(byMap).flatMap((candidates) => Object.values(candidates).flat());
  if (all.length > MAX_CANDIDATE_COUNT) {
    throw new Error(`CSSX style maps support at most ${MAX_CANDIDATE_COUNT} utility candidates.`);
  }
  return { byMap, all };
}
