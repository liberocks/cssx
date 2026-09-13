import { splitCandidateList } from './candidate';
import { MAX_STYLE_MAP_ENTRIES, MAX_CANDIDATE_COUNT } from './candidate-limits';
import { createClassNameAllocator } from './class-name-allocator';
import { compileCandidates } from './compile-candidates';
import type { CompiledStyle } from './compiled-style';
import type { CompiledUtility } from './compiled-utility';
import { compositeIdentity } from './composite-identity';
import { createAtomIdentities } from './create-atom-identities';
import { packedAtomicClasses } from './packed-atomic-classes';
import { planReusability } from './plan-reusability';
import type { StyleCompilerOptions } from './style-compiler';
import { parseTheme } from './theme';

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
  const candidatesByMap: Record<string, Readonly<Record<string, readonly string[]>>> = Object.create(null) as Record<
    string,
    Readonly<Record<string, readonly string[]>>
  >;
  const theme = parseTheme(options.theme);

  for (const [mapName, input] of Object.entries(inputs)) {
    if (Object.keys(input).length > MAX_STYLE_MAP_ENTRIES) {
      throw new Error(`CSSX style maps support at most ${MAX_STYLE_MAP_ENTRIES} entries.`);
    }
    const candidates: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
    for (const [name, source] of Object.entries(input)) {
      candidates[name] = splitCandidateList(source);
    }
    candidatesByMap[mapName] = candidates;
  }

  const allCandidates = Object.values(candidatesByMap).flatMap((candidates) => Object.values(candidates).flat());
  if (allCandidates.length > MAX_CANDIDATE_COUNT) {
    throw new Error(`CSSX style maps support at most ${MAX_CANDIDATE_COUNT} utility candidates.`);
  }
  const compiledCandidates = compileCandidates(allCandidates, theme);
  const allocator = options.classNameAllocator ?? createClassNameAllocator(options.className);
  // Keep atoms symbolic while planning so emitted composites get compact serial
  // names ahead of atomic classes that may be pruned from the final stylesheet.
  const atomIdentities = createAtomIdentities(allCandidates, theme, compiledCandidates, allocator);
  const styleMaps: Record<string, CompiledStyleRecordMap> = Object.create(null) as Record<
    string,
    CompiledStyleRecordMap
  >;
  const composites: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
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
        const names = atomIdentities.symbols[candidate]!;
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

  const plannedCompositions = planReusability(
    Object.values(compositionAtomsByMap).flatMap((atomsByStyle) => Object.values(atomsByStyle)),
    options.reusabilityBudget,
    allocator,
  );
  const allocatedAtoms = allocator.allocate([...atomIdentities.allocationIdentities.values()]);
  /** Resolves compact atom symbols without repeatedly looking up full allocation identities. */
  const allocatedAtomClasses = new Map<string, string>();
  for (const [symbol, identity] of atomIdentities.allocationIdentities) {
    allocatedAtomClasses.set(symbol, allocatedAtoms.get(identity)!);
  }
  const classNames: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
  const classes: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [candidate, identities] of Object.entries(atomIdentities.symbols)) {
    const names = identities.map((identity) => allocatedAtomClasses.get(identity)!);
    classNames[candidate] = names;
    classes[candidate] = names.join(' ');
  }

  for (const [mapName, candidates] of Object.entries(candidatesByMap)) {
    const styles: Record<string, CompiledStyle> = Object.create(null) as Record<string, CompiledStyle>;
    const classNamesByStyle: Record<string, string> = Object.create(null) as Record<string, string>;
    const recordsByStyle = recordsByMap[mapName]!;
    const compositionAtomsByStyle = compositionAtomsByMap[mapName]!;
    for (const name of Object.keys(candidates)) {
      const atomicIdentities = compositionAtomsByStyle[name]!;
      const identity = compositeIdentity(atomicIdentities);
      const plannedClassName = plannedCompositions.classNames.get(identity) ?? '';
      const className = plannedClassName
        .split(' ')
        .map((value) => allocatedAtomClasses.get(value) ?? value)
        .join(' ');
      const records = recordsByStyle[name]!.map((record) => {
        const [atomicIdentity, ...rest] = record;
        return [atomicIdentity === null ? null : allocatedAtomClasses.get(atomicIdentity)!, ...rest] as CompiledUtility;
      });
      styles[name] = { $$css: 2, c: className, _: records };
      classNamesByStyle[name] = className;
      for (const fragment of plannedCompositions.fragments.get(identity) ?? []) {
        composites[fragment.className] = fragment.atomicClasses.map((atomicIdentity) =>
          allocatedAtomClasses.get(atomicIdentity)!,
        );
      }
    }
    styleMaps[mapName] = { styles, classes, candidates, classNames: classNamesByStyle, composites };
  }

  return { styleMaps, classes, composites };
}
