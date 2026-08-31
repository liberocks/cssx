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
  return compileStyleRecordMaps({ $: input }, options).styleMaps.$!;
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
        const { classification, atoms } = compiledCandidate;
        const names = atomIdentities.symbols[candidate]!;
        for (let index = 0; index < atoms.length; index++) {
          const atom = atoms[index]!;
          const className = names[index]!;
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
  const allocatedAtoms = allocator.allocate([...atomIdentities.allocationIdentities.values()]);
  const classNames: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
  const classes: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [candidate, identities] of Object.entries(atomIdentities.symbols)) {
    const names = identities.map((identity) => allocatedAtoms.get(atomIdentities.allocationIdentities.get(identity)!)!);
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
        .map((value) => allocatedAtoms.get(atomIdentities.allocationIdentities.get(value)!) ?? value)
        .join(' ');
      const records = recordsByStyle[name]!.map((record) => {
        const [atomicIdentity, ...rest] = record;
        return [
          atomicIdentity === null
            ? null
            : allocatedAtoms.get(atomIdentities.allocationIdentities.get(atomicIdentity)!)!,
          ...rest,
        ] as CompiledUtility;
      });
      styles[name] = { $$css: 2, c: className, _: records };
      classNamesByStyle[name] = className;
      for (const fragment of plannedCompositions.fragments.get(identity) ?? []) {
        composites[fragment.className] = fragment.atomicClasses.map((atomicIdentity) =>
          allocatedAtoms.get(atomIdentities.allocationIdentities.get(atomicIdentity)!)!,
        );
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
        identities.map((identity, index) => [identity, canonicalCompositions[index]!.join(' ')] as const),
      ),
      fragments: new Map(),
    };
  }

  const groups = factorReusableGroups(reusableGroups(canonicalCompositions));
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
        selectedAtoms!.add(atomicClass);
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
    const className = fragmentNames.get(compositeNameIdentity(identity))!;
    const fragment = { className, atomicClasses: group.atomicClasses };
    for (const compositionIndex of group.compositionIndexes) {
      fragmentsForIndex[compositionIndex]!.push(fragment);
    }
  }
  for (let index = 0; index < canonicalCompositions.length; index++) {
    const residualAtoms = canonicalCompositions[index]!.filter(
      (atomicClass) => !atomsByComposition[index]!.has(atomicClass),
    );
    const residualIdentity = compositeIdentity(residualAtoms);
    if (residualIdentity) {
      residualIdentities.add(compositeNameIdentity(residualIdentity));
    }
  }
  const residualNames = allocator.allocate([...residualIdentities]);

  for (let index = 0; index < identities.length; index++) {
    const identity = identities[index]!;
    if (!identity || classNames.has(identity)) {
      continue;
    }
    const fragments = fragmentsForIndex[index]!;
    const residualAtoms = canonicalCompositions[index]!.filter(
      (atomicClass) => !atomsByComposition[index]!.has(atomicClass),
    );
    const residualIdentity = compositeIdentity(residualAtoms);
    const residualClassName = residualIdentity ? residualNames.get(compositeNameIdentity(residualIdentity))! : '';
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
    const identity = identities[index]!;
    if (!identity || classNames.has(identity)) {
      continue;
    }
    const className = names.get(compositeNameIdentity(identity))!;
    classNames.set(identity, className);
    fragments.set(identity, [{ className, atomicClasses: compositions[index]! }]);
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
    for (const atomicClass of compositions[compositionIndex]!) {
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
    .map(({ atomicClasses, compositionIndexes }) => reusableGroup(atomicClasses, compositionIndexes))
    .sort(compareReusableGroups);
}

/**
 * Combines a repeated bundle with two low-value groups that partition its use.
 * This preserves exact composition semantics while avoiding one alias per atom
 * for correlated dimensions.
 */
function factorReusableGroups(groups: readonly ReusableGroup[]): readonly ReusableGroup[] {
  const omitted = new Set<ReusableGroup>();
  const additions: ReusableGroup[] = [];
  for (const parent of groups) {
    if (parent.atomicClasses.length < 2 || parent.compositionIndexes.length < 4 || omitted.has(parent)) {
      continue;
    }
    const children = groups.filter(
      (child) =>
        child !== parent &&
        child.score <= 0 &&
        child.compositionIndexes.length >= 2 &&
        child.compositionIndexes.length < parent.compositionIndexes.length &&
        indexesAreSubset(child.compositionIndexes, parent.compositionIndexes),
    );
    for (let leftIndex = 0; leftIndex < children.length; leftIndex++) {
      const left = children[leftIndex]!;
      for (let rightIndex = leftIndex + 1; rightIndex < children.length; rightIndex++) {
        const right = children[rightIndex]!;
        if (
          !indexesAreDisjoint(left.compositionIndexes, right.compositionIndexes) ||
          !indexesCover(parent.compositionIndexes, left.compositionIndexes, right.compositionIndexes)
        ) {
          continue;
        }
        omitted.add(parent);
        omitted.add(left);
        omitted.add(right);
        additions.push(
          reusableGroup([...parent.atomicClasses, ...left.atomicClasses].sort(), left.compositionIndexes),
          reusableGroup([...parent.atomicClasses, ...right.atomicClasses].sort(), right.compositionIndexes),
        );
        break;
      }
      if (omitted.has(parent)) {
        break;
      }
    }
  }
  return [...groups.filter((group) => !omitted.has(group)), ...additions].sort(compareReusableGroups);
}

/** Creates derived statistics for one exact usage group. */
function reusableGroup(atomicClasses: readonly string[], compositionIndexes: readonly number[]): ReusableGroup {
  const coverage = atomicClasses.length * compositionIndexes.length;
  // A reusable group removes one alias from every matching atom rule while
  // adding one token to every matching static class string.
  const score = (compositionIndexes.length - 1) * atomicClasses.length - compositionIndexes.length;
  return { atomicClasses, compositionIndexes, coverage, score };
}

/** Orders reusable fragments deterministically by the existing score policy. */
function compareReusableGroups(left: ReusableGroup, right: ReusableGroup): number {
  return (
    right.score - left.score ||
    right.coverage - left.coverage ||
    compositeIdentity(left.atomicClasses).localeCompare(compositeIdentity(right.atomicClasses))
  );
}

/** Returns whether every sorted child index belongs to the sorted parent list. */
function indexesAreSubset(child: readonly number[], parent: readonly number[]): boolean {
  let parentIndex = 0;
  for (const index of child) {
    while (parent[parentIndex] !== undefined && parent[parentIndex]! < index) {
      parentIndex++;
    }
    if (parent[parentIndex] !== index) {
      return false;
    }
  }
  return true;
}

/** Returns whether two sorted index lists have no shared entry. */
function indexesAreDisjoint(left: readonly number[], right: readonly number[]): boolean {
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    const leftValue = left[leftIndex]!;
    const rightValue = right[rightIndex]!;
    if (leftValue === rightValue) {
      return false;
    }
    if (leftValue < rightValue) {
      leftIndex++;
    } else {
      rightIndex++;
    }
  }
  return true;
}

/** Returns whether two sorted, disjoint child lists exactly cover the parent. */
function indexesCover(parent: readonly number[], left: readonly number[], right: readonly number[]): boolean {
  let leftIndex = 0;
  let rightIndex = 0;
  for (const index of parent) {
    const next = Math.min(left[leftIndex] ?? Infinity, right[rightIndex] ?? Infinity);
    if (next !== index) {
      return false;
    }
    if (left[leftIndex] === index) {
      leftIndex++;
    } else {
      rightIndex++;
    }
  }
  return leftIndex === left.length && rightIndex === right.length;
}

/** Selects positive-value groups without exceeding the configured atom coverage. */
function selectReusableGroups(
  groups: readonly ReusableGroup[],
  totalAtomOccurrences: number,
  budget: number | 'auto',
): readonly ReusableGroup[] {
  const eligible = groups.filter(
    (group) => group.score > 0 || (group.atomicClasses.length === 1 && group.compositionIndexes.length >= 3),
  );
  if (budget === 'auto') {
    return eligible;
  }
  const limit = Math.floor((totalAtomOccurrences * budget) / 100);
  const selected: ReusableGroup[] = [];
  let coverage = 0;
  for (const group of eligible) {
    if (coverage + group.coverage > limit) {
      continue;
    }
    selected.push(group);
    coverage += group.coverage;
  }
  return selected;
}

/**
 * Creates deterministic symbolic atom identities from emitted declarations.
 *
 * This keeps identical CSS stable across input order and gives atomized utilities
 * separate identities, allowing emitted composites to be allocated first.
 *
 * @param candidates Utility candidates to name.
 * @param theme Parsed theme that affects declarations.
 * @returns Atom identities for every distinct candidate.
 */
function createAtomIdentities(
  candidates: readonly string[],
  theme: ReturnType<typeof parseTheme>,
  compiledCandidates: ReadonlyMap<string, CompiledCandidate>,
  allocator: ClassNameAllocator,
): {
  readonly symbols: Readonly<Record<string, readonly string[]>>;
  readonly allocationIdentities: ReadonlyMap<string, string>;
} {
  const themeSignature = serializeThemeSignature(theme);
  const symbols: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
  const symbolsByIdentity = atomSymbolsFor(allocator);
  const allocationIdentities = new Map<string, string>();
  for (const candidate of [...new Set(candidates)].sort()) {
    const compiledCandidate = compiledCandidates.get(candidate)!;
    const { classification, atoms } = compiledCandidate;
    symbols[candidate] = atoms.map((atom) => {
      const payload = atom
        .map(
          (declaration) =>
            `${declaration.property}:${declaration.value}:${declaration.selectorSuffix ?? ''}${declaration.atRule ? `:${declaration.atRule}` : ''}`,
        )
        .join(';');
      const identity = `${COMPILER_ABI}\u0000${themeSignature}\u0000${classification.scope}\u0000${payload}`;
      const existing = symbolsByIdentity.get(identity);
      if (existing) {
        allocationIdentities.set(existing, identity);
        return existing;
      }
      const symbol = `a${symbolsByIdentity.size.toString(36)}`;
      symbolsByIdentity.set(identity, symbol);
      allocationIdentities.set(symbol, identity);
      return symbol;
    });
  }
  return { symbols, allocationIdentities };
}

/** Keeps symbolic composition atoms stable across compiler calls sharing an allocator. */
const atomSymbolsByAllocator = new WeakMap<object, Map<string, string>>();

/** Returns the collision-free symbolic atom namespace associated with one allocator. */
function atomSymbolsFor(allocator: ClassNameAllocator): Map<string, string> {
  const key = allocator as object;
  const existing = atomSymbolsByAllocator.get(key);
  if (existing) {
    return existing;
  }
  const symbols = new Map<string, string>();
  atomSymbolsByAllocator.set(key, symbols);
  return symbols;
}

/** Fully validated options used while allocating generated classes. */
interface NormalizedClassNameOptions {
  readonly variant: 'random' | 'serial';
  readonly prefix: string;
  readonly suffix: string;
  readonly length?: number;
}

/**
 * Validates and supplies defaults for class-name options.
 *
 * @param options User-supplied naming options.
 * @returns Validated naming options.
 */
function normalizeClassNameOptions(options: ClassNameOptions | undefined): NormalizedClassNameOptions {
  const variant = options?.variant ?? 'serial';
  const prefix = options?.prefix ?? 's';
  const suffix = options?.suffix ?? 'x';
  const length = options?.length;
  if (variant !== 'random' && variant !== 'serial') {
    throw new Error('CSSX className.variant must be "random" or "serial".');
  }
  if (!/^[A-Za-z_-][A-Za-z0-9_-]*$/.test(prefix)) {
    throw new Error('CSSX className.prefix must be a non-empty safe CSS identifier prefix.');
  }
  if (!/^[A-Za-z0-9_-]*$/.test(suffix)) {
    throw new Error('CSSX className.suffix must contain only letters, digits, hyphens, or underscores.');
  }
  if (length !== undefined && (!Number.isSafeInteger(length) || length < 1 || length > 64)) {
    throw new Error('CSSX className.length must be an integer from 1 through 64.');
  }
  if (variant === 'serial' && length !== undefined) {
    throw new Error('CSSX className.length is only supported by the random naming variant.');
  }
  return { variant, prefix, suffix, ...(length === undefined ? {} : { length }) };
}

/**
 * Assigns unique names to identities in one compilation namespace.
 *
 * Serial names use a compact case-sensitive base-62 counter. Random names use
 * a stable hash and deterministic probing, so choosing a shorter hash cannot
 * silently collide.
 *
 * @param options User-supplied naming options.
 * @returns A stateful class-name allocator.
 */
export function createClassNameAllocator(options: ClassNameOptions = {}): ClassNameAllocator {
  return new GeneratedClassNameAllocator(normalizeClassNameOptions(options));
}

/** Allocates generated class names while preserving previous identity assignments. */
class GeneratedClassNameAllocator implements ClassNameAllocator {
  private readonly classNames = new Map<string, string>();
  private readonly allocated = new Set<string>();
  private serialCounter = 0n;

  constructor(private readonly naming: NormalizedClassNameOptions) {}

  allocate(identities: readonly string[]): ReadonlyMap<string, string> {
    const newIdentities = [...new Set(identities)].filter((identity) => !this.classNames.has(identity)).sort();
    if (this.naming.variant === 'random' && this.naming.length !== undefined) {
      const capacity = 36n ** BigInt(this.naming.length);
      if (BigInt(newIdentities.length + this.allocated.size) > capacity) {
        throw new Error(
          `CSSX className.length ${this.naming.length} cannot name every generated class without a collision.`,
        );
      }
    }
    for (const identity of newIdentities) {
      let attempt = 0;
      let className = '';
      do {
        const core =
          this.naming.variant === 'serial'
            ? serialClassFragment(this.serialCounter++)
            : randomClassFragment(identity, this.naming.length, attempt);
        className = `${this.naming.prefix}${core}${this.naming.suffix}`;
        attempt++;
      } while (this.allocated.has(className));
      this.allocated.add(className);
      this.classNames.set(identity, className);
    }
    return new Map(identities.map((identity) => [identity, this.classNames.get(identity)!] as const));
  }

  reserve(classNames: readonly string[]): void {
    for (const className of classNames) {
      this.allocated.add(className);
    }
  }
}

/** Case-sensitive digits used for compact serial class names. */
const SERIAL_CLASS_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Encodes a non-negative counter value in the serial class-name alphabet.
 *
 * @param value Counter value to encode.
 * @returns A base-62 serial fragment, where `10` follows uppercase `Z`.
 */
function serialClassFragment(value: bigint): string {
  let remaining = value;
  let fragment = '';
  const base = BigInt(SERIAL_CLASS_ALPHABET.length);
  do {
    fragment = `${SERIAL_CLASS_ALPHABET[Number(remaining % base)]!}${fragment}`;
    remaining /= base;
  } while (remaining > 0n);
  return fragment;
}

/**
 * Creates a stable base-36 hash fragment, expanding deterministically when needed.
 *
 * @param identity Full declaration or composition identity.
 * @param length Requested fixed fragment length, when configured.
 * @param attempt Collision-resolution attempt.
 * @returns A stable hash fragment.
 */
function randomClassFragment(identity: string, length: number | undefined, attempt: number): string {
  if (length === undefined) {
    return attempt === 0 ? hash(identity) : `${hash(identity)}-${hash(`${identity}\u0000${attempt}`)}`;
  }
  let fragment = '';
  for (let part = 0; fragment.length < length; part++) {
    fragment += hash(`${identity}\u0000${attempt}\u0000${part}`).padStart(13, '0');
  }
  return fragment.slice(0, length);
}

/**
 * Finds the conflict record for one atom, preferring explicit semantic metadata.
 *
 * Atomization can split a shorthand utility into independent properties. This
 * function preserves the exact reset behavior for those properties so runtime
 * composition matches the CSS cascade instead of treating every atom as a whole.
 *
 * @param atom Declaration atom to classify.
 * @param fallback Candidate-level semantic record.
 * @returns Semantic record used by the compiled runtime style.
 */
function atomSemantics(
  atom: readonly {
    readonly property: string;
    readonly semanticGroup?: string;
    readonly semanticConflicts?: readonly string[];
  }[],
  fallback: UtilityConflictRecord,
): UtilityConflictRecord {
  const semanticGroup = atom[0]!.semanticGroup;
  if (semanticGroup) {
    return { scope: fallback.scope, group: semanticGroup, conflicts: atom[0]!.semanticConflicts ?? [semanticGroup] };
  }
  const property = atom[0]!.property;
  const slot = ATOM_SEMANTIC_SLOTS[property] ?? SHORTHAND_SEMANTIC_SLOTS[property];
  return slot ? { scope: fallback.scope, ...slot } : { scope: fallback.scope, group: property, conflicts: [property] };
}

/** Semantic data reused by every atom with a known emitted property. */
const ATOM_SEMANTIC_SLOTS: Readonly<Record<string, Omit<UtilityConflictRecord, 'scope'>>> = {
  padding: { group: 'p', conflicts: ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl'] },
  'padding-left': { group: 'pl', conflicts: ['pl'] },
  'padding-right': { group: 'pr', conflicts: ['pr'] },
  'padding-top': { group: 'pt', conflicts: ['pt'] },
  'padding-bottom': { group: 'pb', conflicts: ['pb'] },
  margin: { group: 'm', conflicts: ['m', 'mx', 'my', 'mt', 'mr', 'mb', 'ml'] },
  'margin-left': { group: 'ml', conflicts: ['ml'] },
  'margin-right': { group: 'mr', conflicts: ['mr'] },
  'margin-top': { group: 'mt', conflicts: ['mt'] },
  'margin-bottom': { group: 'mb', conflicts: ['mb'] },
  'border-width': {
    group: 'border-width',
    conflicts: ['border-width', 'border-x', 'border-y', 'border-top', 'border-right', 'border-bottom', 'border-left'],
  },
  'border-top-width': { group: 'border-top', conflicts: ['border-top'] },
  'border-right-width': { group: 'border-right', conflicts: ['border-right'] },
  'border-bottom-width': { group: 'border-bottom', conflicts: ['border-bottom'] },
  'border-left-width': { group: 'border-left', conflicts: ['border-left'] },
  'border-color': { group: 'border-color', conflicts: ['border-color'] },
  '--cssx-translate-x': { group: 'translate-x', conflicts: ['translate-x'] },
  '--cssx-translate-y': { group: 'translate-y', conflicts: ['translate-y'] },
  '--cssx-scale-x': { group: 'scale-x', conflicts: ['scale-x'] },
  '--cssx-scale-y': { group: 'scale-y', conflicts: ['scale-y'] },
  '--cssx-skew-x': { group: 'skew-x', conflicts: ['skew-x'] },
  '--cssx-skew-y': { group: 'skew-y', conflicts: ['skew-y'] },
};

/** Semantic data for shorthand declarations and their independently writable parts. */
const SHORTHAND_SEMANTIC_SLOTS: Readonly<Record<string, Omit<UtilityConflictRecord, 'scope'>>> = Object.fromEntries(
  Object.entries(SHORTHAND_WRITE_SETS).flatMap(([shorthand, components]) => [
    [shorthand, { group: shorthand, conflicts: [shorthand, ...components] }],
    ...components.map((property) => [property, { group: property, conflicts: [property] }]),
  ]),
);

/**
 * Serializes resolved theme values into the class-name namespace.
 *
 * @param theme Parsed theme used for the signature.
 * @returns Stable theme signature for hashing.
 */
function serializeThemeSignature(theme: ReturnType<typeof parseTheme>): string {
  const outputSignature = theme.mode === 'inline' && !theme.prefix ? '' : `${theme.mode}:${theme.prefix}|`;
  const tokens = Object.keys(theme.tokens)
    .sort()
    .map((name) => `${name}:${resolveThemeValue(theme, name) ?? 'initial'}`)
    .join('|');
  const keyframes = Object.keys(theme.keyframes)
    .sort()
    .map((name) => `${name}:${theme.keyframes[name]!}`)
    .join('|');
  return `${outputSignature}${tokens}|${keyframes}`;
}

/**
 * Merges compiled styles from left to right.
 *
 * @param styles Compiled styles to merge.
 * @returns The final class string.
 */
export function mergeCompiledStyles(styles: readonly CompiledStyle[]): string {
  return reducePackedUtilities(styles.flatMap((style) => style._))
    .map((record) => record[0])
    .filter((className): className is string => className !== null)
    .join(' ');
}

/** A composite class and the atomic classes that implement it. */
export interface StyleComposition {
  /** Stable class for the complete reduced style. */
  readonly className: string;
  /** Winning atomic classes in their source order. */
  readonly atomicClasses: readonly string[];
}

/**
 * Creates one composite class for a list of compiled styles.
 *
 * @param styles Compiled styles to compose from left to right.
 * @param classNameAllocator Optional allocator shared with the styles' compilation.
 * @returns The composite class and its winning atomic classes.
 */
export function composeCompiledStyles(
  styles: readonly CompiledStyle[],
  classNameAllocator: ClassNameAllocator = createClassNameAllocator(),
): StyleComposition {
  return composePackedUtilities(
    styles.flatMap((style) => style._),
    classNameAllocator,
  );
}

/** Reduces compiled utility records without projecting their class names. */
function reducePackedUtilities(records: readonly CompiledUtility[]): readonly CompiledUtility[] {
  const blockedByScope = new Map<string, Set<string>>();
  const output: CompiledUtility[] = [];
  for (let index = records.length - 1; index >= 0; index--) {
    const record = records[index];
    if (!record) {
      continue;
    }
    const blocked = blockedByScope.get(record[1]) ?? new Set<string>();
    blockedByScope.set(record[1], blocked);
    if (record[0] !== null && blocked.has(record[2])) {
      continue;
    }
    for (let conflictIndex = 2; conflictIndex < record.length; conflictIndex++) {
      const conflict = record[conflictIndex];
      if (conflict) {
        blocked.add(conflict);
      }
    }
    if (record[0]) {
      output.push(record);
    }
  }
  return output.reverse();
}

/** Creates a stable composite identity from reduced atomic records. */
function composePackedUtilities(
  records: readonly CompiledUtility[],
  classNameAllocator: ClassNameAllocator,
): StyleComposition {
  const atomicClasses = packedAtomicClasses(records);
  const identity = compositeIdentity(atomicClasses);
  classNameAllocator.reserve(atomicClasses);
  return {
    className: identity
      ? classNameAllocator.allocate([compositeNameIdentity(identity)]).get(compositeNameIdentity(identity))!
      : '',
    atomicClasses,
  };
}

/** Extracts the atomic classes that survive a runtime composition. */
function packedAtomicClasses(records: readonly CompiledUtility[]): readonly string[] {
  return reducePackedUtilities(records)
    .map((record) => record[0])
    .filter((className): className is string => className !== null);
}

/** Creates the stable identity of a composite class from its atomic classes. */
function compositeIdentity(atomicClasses: readonly string[]): string {
  return [...new Set(atomicClasses)].sort().join('\u0000');
}

/** Adds the compiler namespace to a composite identity before it receives a name. */
function compositeNameIdentity(identity: string): string {
  return `${COMPILER_ABI}\u0000composite\u0000${identity}`;
}

/**
 * Computes a compact deterministic 64-bit hash for generated class names.
 *
 * @param value Full class-name identity.
 * @returns Base-36 hash text.
 */
function hash(value: string): string {
  let result = 0xcbf29ce484222325n;
  for (let index = 0; index < value.length; index++) {
    result ^= BigInt(value.charCodeAt(index));
    result = BigInt.asUintN(64, result * 0x100000001b3n);
  }
  return result.toString(36);
}
