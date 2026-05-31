import { splitCandidateList } from './candidate';
import { classifyCandidate } from './semantics';
import { parseTheme, resolveThemeValue } from './theme';
import { getUtilityAtoms } from './utilities';
import { SHORTHAND_WRITE_SETS } from './shorthand-write-sets';

/** Compiler identity included in generated class-name hashes. */
const COMPILER_ABI = 'cssx-utility-compiler-v2';
/** Maximum number of named styles allowed in one source map. */
const MAX_STYLE_MAP_ENTRIES = 10_000;
/** Maximum number of utility candidates allowed across one compilation. */
const MAX_CANDIDATE_COUNT = 50_000;

/** Style groups that one utility writes and clears. */
export interface UtilityConflictRecord {
  /** Variant and importance scope where this record applies. */
  readonly scope: string;
  /** Semantic write group owned by the utility. */
  readonly group: string;
  /** Groups cleared when this utility is applied later. */
  readonly conflicts: readonly string[];
}

/**
 * A utility record created by the compiler.
 *
 * A null class name clears related style groups without adding CSS.
 */
export type CompiledUtility = readonly [
  className: string | null,
  scope: string,
  group: string,
  ...conflicts: readonly string[],
];

/** A compiled style that contains utility records. */
export interface CompiledStyle {
  /** Marker used to identify a compiled CSSX style. */
  readonly $$css: 2;
  /** Composite class used when this style can be applied as one unit. */
  readonly c: string;
  /** Ordered utility records used by the runtime merge operation. */
  readonly _: readonly CompiledUtility[];
}

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

/** Options for creating compiled style records. */
export interface StyleCompilerOptions {
  /** CSS theme input used when generating class names. */
  readonly theme?: string;
  /** Options that control generated atomic and composite class names. */
  readonly className?: ClassNameOptions;
  /** Shared allocator used to keep class names unique across compiler calls. */
  readonly classNameAllocator?: ClassNameAllocator;
  /** Controls how aggressively static styles share generated class fragments. */
  readonly reusabilityBudget?: ReusabilityBudget;
}

/** Percentage of winning atomic occurrences eligible for reusable fragments. */
export type ReusabilityBudget = number | 'auto';

/** Options that control generated CSS class names. */
export interface ClassNameOptions {
  /** Naming algorithm. Defaults to `serial`; `random` is a stable content hash. */
  readonly variant?: 'random' | 'serial';
  /** Text prepended to every generated class. Defaults to `s`. */
  readonly prefix?: string;
  /** Text appended to every generated class. Defaults to `x`. */
  readonly suffix?: string;
  /** Length of the hash fragment when `variant` is `random`. */
  readonly length?: number;
}

/** Stateful allocator that keeps generated classes unique across compiler calls. */
export interface ClassNameAllocator {
  /** Allocates one unique class for every supplied identity. */
  allocate(identities: readonly string[]): ReadonlyMap<string, string>;
  /** Reserves class names that were allocated outside this allocator. */
  reserve(classNames: readonly string[]): void;
}

/**
 * Finds the style groups used by one static utility.
 *
 * @param candidate A static utility string.
 * @returns Its style groups, or null when CSSX does not support it.
 */
export function classifyUtility(candidate: string): UtilityConflictRecord | null {
  const semantics = classifyCandidate(candidate);
  if (!semantics) {
    return null;
  }
  return semantics;
}

/**
 * Compiles one static style map to records for the runtime.
 *
 * @param input Style names and their utility strings.
 * @param options Compiler options.
 * @returns The compiled styles, class names, and source candidates.
 */
export function compileStyleRecords(
  input: Readonly<Record<string, string>>,
  options: StyleCompilerOptions = {},
): CompiledStyleRecordMap {
  return compileStyleRecordMaps({ $: input }, options).styleMaps.$ ?? emptyCompiledStyleRecordMap();
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
  const allocatedClasses = allocateClassNames(allCandidates, theme, compiledCandidates, allocator);
  const classNames = allocatedClasses.classNames;
  const classes: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [candidate, names] of Object.entries(classNames)) {
    classes[candidate] = names.join(' ');
  }
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
        const compiledCandidate = compiledCandidates.get(candidate);
        if (!compiledCandidate) {
          throw new Error(`CSSX cannot classify utility "${candidate}" for composition.`);
        }
        const { classification, atoms } = compiledCandidate;
        const names = classNames[candidate];
        if (!names || names.length !== atoms.length) {
          throw new Error(`CSSX could not assign generated classes to utility "${candidate}".`);
        }
        for (let index = 0; index < atoms.length; index++) {
          const atom = atoms[index];
          const className = names[index];
          if (!atom || !className) {
            continue;
          }
          const semantics = atomSemantics(atom, classification);
          if (semantics.conflicts.length > 1) {
            records.push([null, classification.scope, semantics.group, ...semantics.conflicts]);
          }
          records.push([className, classification.scope, semantics.group, semantics.group]);
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

  for (const [mapName, candidates] of Object.entries(candidatesByMap)) {
    const styles: Record<string, CompiledStyle> = Object.create(null) as Record<string, CompiledStyle>;
    const classNamesByStyle: Record<string, string> = Object.create(null) as Record<string, string>;
    const recordsByStyle = recordsByMap[mapName] ?? {};
    const compositionAtomsByStyle = compositionAtomsByMap[mapName] ?? {};
    for (const name of Object.keys(candidates)) {
      const records = recordsByStyle[name] ?? [];
      const atomicClasses = compositionAtomsByStyle[name] ?? [];
      const identity = compositeIdentity(atomicClasses);
      const className = identity ? (plannedCompositions.classNames.get(identity) ?? '') : '';
      styles[name] = { $$css: 2, c: className, _: records };
      classNamesByStyle[name] = className;
      for (const fragment of plannedCompositions.fragments.get(identity) ?? []) {
        composites[fragment.className] = fragment.atomicClasses;
      }
    }
    styleMaps[mapName] = { styles, classes, candidates, classNames: classNamesByStyle, composites };
  }

  return { styleMaps, classes, composites };
}

/** Reusable candidate data shared by naming and static conflict-record generation. */
interface CompiledCandidate {
  readonly classification: UtilityConflictRecord;
  readonly atoms: ReturnType<typeof getUtilityAtoms>;
}

/** Resolves each distinct candidate once for the current compilation theme. */
function compileCandidates(
  candidates: readonly string[],
  theme: ReturnType<typeof parseTheme>,
): ReadonlyMap<string, CompiledCandidate> {
  const compiled = new Map<string, CompiledCandidate>();
  for (const candidate of new Set(candidates)) {
    const classification = classifyUtility(candidate);
    if (!classification) {
      throw new Error(`CSSX cannot classify utility "${candidate}" for composition.`);
    }
    compiled.set(candidate, { classification, atoms: getUtilityAtoms(candidate, theme) });
  }
  return compiled;
}

/** One reusable fragment emitted by a reusability plan. */
interface ReusableFragment {
  readonly className: string;
  readonly atomicClasses: readonly string[];
}

/** Final class strings and selector aliases selected for static compositions. */
interface ReusabilityPlan {
  readonly classNames: ReadonlyMap<string, string>;
  readonly fragments: ReadonlyMap<string, readonly ReusableFragment[]>;
}

/** Candidate group of atoms that always appears in the same style entries. */
interface ReusableGroup {
  readonly atomicClasses: readonly string[];
  readonly compositionIndexes: readonly number[];
  readonly coverage: number;
  readonly score: number;
}

/**
 * Selects reusable groups of winning atoms for static styles.
 *
 * At zero every style keeps its complete alias. At one hundred every winning
 * atom is emitted directly. Intermediate budgets select groups whose atoms
 * have the identical usage set, which keeps planning linear in atom usage and
 * avoids overlapping-set search.
 */
function planReusability(
  compositions: readonly (readonly string[])[],
  budget: ReusabilityBudget | undefined,
  allocator: ClassNameAllocator,
): ReusabilityPlan {
  const normalizedBudget = normalizeReusabilityBudget(budget);
  const canonicalCompositions = compositions.map((atomicClasses) => [...new Set(atomicClasses)].sort());
  const identities = canonicalCompositions.map(compositeIdentity);
  const allIdentities = [...new Set(identities.filter(Boolean))];

  if (normalizedBudget === 0) {
    const names = allocator.allocate(allIdentities.map(compositeNameIdentity));
    return createCompleteCompositionPlan(identities, canonicalCompositions, names);
  }
  if (normalizedBudget === 100) {
    return {
      classNames: new Map(
        identities.map((identity, index) => [identity, canonicalCompositions[index]?.join(' ') ?? ''] as const),
      ),
      fragments: new Map(),
    };
  }

  const groups = reusableGroups(canonicalCompositions);
  const selectedGroups = selectReusableGroups(
    groups,
    canonicalCompositions.reduce((total, atomicClasses) => total + atomicClasses.length, 0),
    normalizedBudget,
  );
  const atomsByComposition = canonicalCompositions.map(() => new Set<string>());
  for (const group of selectedGroups) {
    for (const compositionIndex of group.compositionIndexes) {
      const selectedAtoms = atomsByComposition[compositionIndex];
      for (const atomicClass of group.atomicClasses) {
        selectedAtoms?.add(atomicClass);
      }
    }
  }

  const fragmentIdentities = selectedGroups.map((group) =>
    compositeNameIdentity(compositeIdentity(group.atomicClasses)),
  );
  const fragmentNames = allocator.allocate(fragmentIdentities);
  const fragmentsByComposition = new Map<string, ReusableFragment[]>();
  const classNames = new Map<string, string>();
  const residualIdentities = new Set<string>();
  const fragmentsForIndex = canonicalCompositions.map(() => [] as ReusableFragment[]);

  for (const group of selectedGroups) {
    const identity = compositeIdentity(group.atomicClasses);
    const className = fragmentNames.get(compositeNameIdentity(identity)) ?? '';
    const fragment = { className, atomicClasses: group.atomicClasses };
    for (const compositionIndex of group.compositionIndexes) {
      fragmentsForIndex[compositionIndex]?.push(fragment);
    }
  }
  for (let index = 0; index < canonicalCompositions.length; index++) {
    const residualAtoms = (canonicalCompositions[index] ?? []).filter(
      (atomicClass) => !atomsByComposition[index]?.has(atomicClass),
    );
    const residualIdentity = compositeIdentity(residualAtoms);
    if (residualIdentity) {
      residualIdentities.add(compositeNameIdentity(residualIdentity));
    }
  }
  const residualNames = allocator.allocate([...residualIdentities]);

  for (let index = 0; index < identities.length; index++) {
    const identity = identities[index] ?? '';
    if (!identity || classNames.has(identity)) {
      continue;
    }
    const fragments = fragmentsForIndex[index] ?? [];
    const residualAtoms = (canonicalCompositions[index] ?? []).filter(
      (atomicClass) => !atomsByComposition[index]?.has(atomicClass),
    );
    const residualIdentity = compositeIdentity(residualAtoms);
    const residualClassName = residualIdentity
      ? (residualNames.get(compositeNameIdentity(residualIdentity)) ?? '')
      : '';
    const className = [...fragments.map((fragment) => fragment.className), residualClassName].filter(Boolean).join(' ');
    classNames.set(identity, className);
    fragmentsByComposition.set(identity, [
      ...fragments,
      ...(residualClassName ? [{ className: residualClassName, atomicClasses: residualAtoms }] : []),
    ]);
  }
  return { classNames, fragments: fragmentsByComposition };
}

/** Converts a complete-composition allocation to the common planner result. */
function createCompleteCompositionPlan(
  identities: readonly string[],
  compositions: readonly (readonly string[])[],
  names: ReadonlyMap<string, string>,
): ReusabilityPlan {
  const classNames = new Map<string, string>();
  const fragments = new Map<string, readonly ReusableFragment[]>();
  for (let index = 0; index < identities.length; index++) {
    const identity = identities[index] ?? '';
    if (!identity || classNames.has(identity)) {
      continue;
    }
    const className = names.get(compositeNameIdentity(identity)) ?? '';
    classNames.set(identity, className);
    fragments.set(identity, [{ className, atomicClasses: compositions[index] ?? [] }]);
  }
  return { classNames, fragments };
}

/** Validates a user-supplied reusability coverage budget. */
function normalizeReusabilityBudget(budget: ReusabilityBudget | undefined): number | 'auto' {
  if (budget === undefined || budget === 'auto') {
    return 'auto';
  }
  if (!Number.isFinite(budget) || budget < 0 || budget > 100) {
    throw new Error('CSSX reusabilityBudget must be "auto" or a number from 0 through 100.');
  }
  return budget;
}

/** Groups atoms that occur in exactly the same static composition entries. */
function reusableGroups(compositions: readonly (readonly string[])[]): readonly ReusableGroup[] {
  const usageByAtom = new Map<string, number[]>();
  for (let compositionIndex = 0; compositionIndex < compositions.length; compositionIndex++) {
    for (const atomicClass of compositions[compositionIndex] ?? []) {
      const indexes = usageByAtom.get(atomicClass) ?? [];
      indexes.push(compositionIndex);
      usageByAtom.set(atomicClass, indexes);
    }
  }
  const atomsByUsage = new Map<string, { readonly atomicClasses: string[]; readonly compositionIndexes: number[] }>();
  for (const [atomicClass, compositionIndexes] of usageByAtom) {
    if (compositionIndexes.length < 2) {
      continue;
    }
    const key = compositionIndexes.join(',');
    const group = atomsByUsage.get(key) ?? { atomicClasses: [], compositionIndexes };
    group.atomicClasses.push(atomicClass);
    atomsByUsage.set(key, group);
  }
  return [...atomsByUsage.values()]
    .map(({ atomicClasses, compositionIndexes }) => {
      const coverage = atomicClasses.length * compositionIndexes.length;
      // A reusable group removes one alias from every matching atom rule while
      // adding one token to each matching static class string.
      const score = (compositionIndexes.length - 1) * atomicClasses.length - compositionIndexes.length;
      return { atomicClasses, compositionIndexes, coverage, score };
    })
    .filter((group) => group.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.coverage - left.coverage ||
        compositeIdentity(left.atomicClasses).localeCompare(compositeIdentity(right.atomicClasses)),
    );
}

/** Selects positive-value groups without exceeding the configured atom coverage. */
function selectReusableGroups(
  groups: readonly ReusableGroup[],
  totalAtomOccurrences: number,
  budget: number | 'auto',
): readonly ReusableGroup[] {
  if (budget === 'auto') {
    return groups;
  }
  const limit = Math.floor((totalAtomOccurrences * budget) / 100);
  const selected: ReusableGroup[] = [];
  let coverage = 0;
  for (const group of groups) {
    if (coverage + group.coverage > limit) {
      continue;
    }
    selected.push(group);
    coverage += group.coverage;
  }
  return selected;
}

/**
 * Creates the empty result used when a style map has no named entries.
 *
 * @returns An empty compiled style map.
 */
function emptyCompiledStyleRecordMap(): CompiledStyleRecordMap {
  return { styles: {}, classes: {}, candidates: {}, classNames: {}, composites: {} };
}

/**
 * Allocates deterministic classes from emitted declarations, not source spelling.
 *
 * This keeps identical CSS stable across input order and gives atomized utilities
 * separate names. The collision suffix is only used when different identities have
 * the same primary hash, so a real collision cannot silently merge declarations.
 *
 * @param candidates Utility candidates to name.
 * @param theme Parsed theme that affects declarations.
 * @returns Generated classes for every distinct candidate.
 */
function allocateClassNames(
  candidates: readonly string[],
  theme: ReturnType<typeof parseTheme>,
  compiledCandidates: ReadonlyMap<string, CompiledCandidate>,
  allocator: ClassNameAllocator,
): { readonly classNames: Readonly<Record<string, readonly string[]>> } {
  const themeSignature = serializeThemeSignature(theme);
  const classNames: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
  const atomIdentities = new Map<string, readonly string[]>();
  for (const candidate of [...new Set(candidates)].sort()) {
    const compiledCandidate = compiledCandidates.get(candidate);
    if (!compiledCandidate) {
      throw new Error(`CSSX cannot classify utility "${candidate}" for composition.`);
    }
    const { classification, atoms } = compiledCandidate;
    atomIdentities.set(
      candidate,
      atoms.map((atom) => {
        const payload = atom
          .map(
            (declaration) =>
              `${declaration.property}:${declaration.value}:${declaration.selectorSuffix ?? ''}${declaration.atRule ? `:${declaration.atRule}` : ''}`,
