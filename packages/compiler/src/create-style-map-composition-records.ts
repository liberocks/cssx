import type { StyleMapCandidates } from './collect-style-map-candidates';
import type { CompiledCandidate } from './compile-candidates';
import type { CompiledUtility } from './compiled-utility';
import { packedAtomicClasses } from './packed-atomic-classes';

/** Record and atomic-composition data created for each style map. */
export interface StyleMapCompositionRecords {
  /** Utility conflict records keyed by map name and style name. */
  readonly recordsByMap: Readonly<Record<string, Readonly<Record<string, readonly CompiledUtility[]>>>>;
  /** Packed atomic class symbols keyed by map name and style name. */
  readonly compositionAtomsByMap: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;
}

/**
 * Creates conflict records and packed atom lists for every style entry.
 *
 * @param candidatesByMap Candidate lists grouped by map and style name.
 * @param compiledCandidates Compiled candidate semantics and atom declarations.
 * @param symbols Symbolic atom names keyed by candidate.
 * @returns Runtime conflict records and composition atom lists.
 */
export function createStyleMapCompositionRecords(
  candidatesByMap: StyleMapCandidates,
  compiledCandidates: ReadonlyMap<string, CompiledCandidate>,
  symbols: Readonly<Record<string, readonly string[]>>,
): StyleMapCompositionRecords {
  const recordsByMap: Record<string, Readonly<Record<string, readonly CompiledUtility[]>>> = Object.create(
    null,
  ) as Record<string, Readonly<Record<string, readonly CompiledUtility[]>>>;
  const compositionAtomsByMap: Record<string, Readonly<Record<string, readonly string[]>>> = Object.create(
    null,
  ) as Record<string, Readonly<Record<string, readonly string[]>>>;

  for (const [mapName, candidates] of Object.entries(candidatesByMap)) {
    const recordsByStyle: Record<string, readonly CompiledUtility[]> = Object.create(null) as Record<
      string,
      readonly CompiledUtility[]
    >;
    const compositionAtomsByStyle: Record<string, readonly string[]> = Object.create(null) as Record<
      string,
      readonly string[]
    >;
    for (const [name, styleCandidates] of Object.entries(candidates)) {
      const records: CompiledUtility[] = [];
      for (const candidate of styleCandidates) {
        const compiledCandidate = compiledCandidates.get(candidate)!;
        const { atoms, atomSemantics: atomWriteSets } = compiledCandidate;
        const names = symbols[candidate]!;
        for (let index = 0; index < atoms.length; index++) {
          const className = names[index]!;
          const semantics = atomWriteSets[index]!;
          if (semantics.conflicts.length > 1) {
            records.push([null, semantics.scope, semantics.group, ...semantics.conflicts]);
          }
          records.push([className, semantics.scope, semantics.group, semantics.group]);
        }
      }
      recordsByStyle[name] = records;
      compositionAtomsByStyle[name] = packedAtomicClasses(records);
    }
    recordsByMap[mapName] = recordsByStyle;
    compositionAtomsByMap[mapName] = compositionAtomsByStyle;
  }
  return { recordsByMap, compositionAtomsByMap };
}
