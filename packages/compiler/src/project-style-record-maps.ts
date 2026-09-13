import type { StyleMapCandidates } from './collect-style-map-candidates';
import type { CompiledStyleRecordMap } from './compiled-style-record-maps';
import { createCompiledStyleRecordMap } from './create-compiled-style-record-map';
import type { StyleMapCompositionRecords } from './create-style-map-composition-records';
import type { ReusabilityPlan } from './reusability';

/** Inputs required to project every style map into runtime records. */
export interface ProjectStyleRecordMapsOptions {
  /** Candidate lists grouped by map and style name. */
  readonly candidatesByMap: StyleMapCandidates;
  /** Generated class names keyed by utility candidate. */
  readonly classes: Readonly<Record<string, string>>;
  /** Packed conflict records grouped by map and style name. */
  readonly recordsByMap: StyleMapCompositionRecords['recordsByMap'];
  /** Packed atom identities grouped by map and style name. */
  readonly compositionAtomsByMap: StyleMapCompositionRecords['compositionAtomsByMap'];
  /** Allocated concrete names for symbolic atom identities. */
  readonly allocatedAtomClasses: ReadonlyMap<string, string>;
  /** Reusable aliases selected for every style composition. */
  readonly plannedCompositions: ReusabilityPlan;
}

/**
 * Projects each style map and combines the reusable fragments it emits.
 *
 * @param options Candidate maps, runtime records, and allocated class names.
 * @returns Projected maps and composites shared across their styles.
 */
export function projectStyleRecordMaps(options: ProjectStyleRecordMapsOptions) {
  const { candidatesByMap, classes, recordsByMap, compositionAtomsByMap, allocatedAtomClasses, plannedCompositions } =
    options;
  const styleMaps: Record<string, CompiledStyleRecordMap> = Object.create(null) as Record<
    string,
    CompiledStyleRecordMap
  >;
  const composites: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;

  for (const [mapName, candidates] of Object.entries(candidatesByMap)) {
    const projection = createCompiledStyleRecordMap({
      candidates,
      classes,
      recordsByStyle: recordsByMap[mapName]!,
      compositionAtomsByStyle: compositionAtomsByMap[mapName]!,
      allocatedAtomClasses,
      plannedCompositions,
    });
    styleMaps[mapName] = projection.styleMap;
    for (const [className, atomicClasses] of Object.entries(projection.composites)) {
      composites[className] = atomicClasses;
    }
  }

  return { styleMaps, composites };
}
