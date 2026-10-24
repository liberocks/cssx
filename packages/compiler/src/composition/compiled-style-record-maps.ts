import { allocateStyleMapClassNames } from '../atoms/allocate-style-map-class-names';
import { createClassNameAllocator } from '../atoms/class-name-allocator';
import { createAtomIdentities } from '../atoms/create-atom-identities';
import { compileCandidates } from '../compiler/compile-candidates';
import type { StyleCompilerOptions } from '../compiler/style-compiler';
import type { CompiledStyle } from '../shared/compiled-style';
import { parseTheme } from '../theme/theme';
import { collectStyleMapCandidates } from './collect-style-map-candidates';
import { createStyleMapCompositionRecords } from './create-style-map-composition-records';
import { planReusability } from './plan-reusability';
import { projectStyleRecordMaps } from './project-style-record-maps';

/** A compiled style map and its generated class names. */
export interface CompiledStyleRecordMap {
  /** Compiled styles keyed by input style name. */
  readonly styles: Readonly<Record<string, CompiledStyle>>;
  /** Generated classes keyed by utility candidate. */
  readonly classes: Readonly<Record<string, string>>;
  /** Source candidates keyed by input style name. */
  readonly candidates: Readonly<Record<string, readonly string[]>>;
  /** Composite class names keyed by input style name. */
  readonly classNames: Readonly<Record<string, string>>;
  /** Winning atomic classes keyed by composite class name. */
  readonly composites: Readonly<Record<string, readonly string[]>>;
}

/** Several compiled style maps that share generated class names. */
export interface CompiledStyleRecordMaps {
  /** Compiled style maps keyed by map name. */
  readonly styleMaps: Readonly<Record<string, CompiledStyleRecordMap>>;
  /** Generated classes shared by every map. */
  readonly classes: Readonly<Record<string, string>>;
  /** Winning atomic classes shared by every composite class. */
  readonly composites: Readonly<Record<string, readonly string[]>>;
}

/**
 * Compiles several static style maps with shared class names.
 *
 * @param inputs Map names and their utility maps.
 * @param options Compiler options.
 * @returns The compiled maps and their shared class names.
 */
export function compileStyleRecordMaps(
  inputs: Readonly<Record<string, Readonly<Record<string, string>>>>,
  options: StyleCompilerOptions = {},
): CompiledStyleRecordMaps {
  const { byMap: candidatesByMap, all: allCandidates } = collectStyleMapCandidates(inputs);
  const theme = parseTheme(options.theme);
  const compiledCandidates = compileCandidates(allCandidates, theme);
  const allocator = options.classNameAllocator ?? createClassNameAllocator(options.className);
  // Keep atoms symbolic while planning so emitted composites get compact serial
  // names ahead of atomic classes that may be pruned from the final stylesheet.
  const atomIdentities = createAtomIdentities(allCandidates, theme, compiledCandidates, allocator);
  const compositionRecords = createStyleMapCompositionRecords(
    candidatesByMap,
    compiledCandidates,
    atomIdentities.symbols,
  );
  const plannedCompositions = planReusability(
    Object.values(compositionRecords.compositionAtomsByMap).flatMap((atomsByStyle) => Object.values(atomsByStyle)),
    options.reusabilityBudget,
    allocator,
  );
  const { allocatedAtomClasses, classes } = allocateStyleMapClassNames(
    atomIdentities.symbols,
    atomIdentities.allocationIdentities,
    allocator,
  );

  const projection = projectStyleRecordMaps({
    candidatesByMap,
    classes,
    recordsByMap: compositionRecords.recordsByMap,
    compositionAtomsByMap: compositionRecords.compositionAtomsByMap,
    allocatedAtomClasses,
    plannedCompositions,
  });

  return { ...projection, classes };
}
