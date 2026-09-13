import { atomSymbolsForAllocator } from './atom-symbols-for-allocator';
import { parseCandidate, splitCandidateList } from './candidate';
import { createClassNameAllocator } from './class-name-allocator';
import { classifyUtility } from './classify-utility';
import { COMPILER_ABI } from './compiler-abi';
import { composeCompiledStyles } from './compose-compiled-styles';
import type { StyleComposition } from './compose-compiled-styles';
import { compositeIdentity } from './composite-identity';
import { compositeNameIdentity } from './composite-name-identity';
import { mergeCompiledStyles } from './merge-compiled-styles';
import { packedAtomicClasses } from './packed-atomic-classes';
import { classifyCandidate, classifyParsedCandidate } from './semantics';
import { serializeThemeSignature } from './serialize-theme-signature';
import { SHORTHAND_WRITE_SETS } from './shorthand-write-sets';
import { parseTheme } from './theme';
import { themeNamespace } from './theme-namespace';
import { getUtilityAtoms, resolveParsedUtilityRecipe } from './utilities';

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

export { classifyUtility };

export { createClassNameAllocator };

export { mergeCompiledStyles };

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

/** Reusable candidate data shared by naming and static conflict-record generation. */
interface CompiledCandidate {
  readonly classification: UtilityConflictRecord;
  readonly atoms: ReturnType<typeof getUtilityAtoms>;
  readonly atomSemantics: readonly UtilityConflictRecord[];
}

/** Resolves each distinct candidate once for the current compilation theme. */
function compileCandidates(
  candidates: readonly string[],
  theme: ReturnType<typeof parseTheme>,
): ReadonlyMap<string, CompiledCandidate> {
  const compiled = new Map<string, CompiledCandidate>();
  for (const candidate of new Set(candidates)) {
    const parsedCandidate = parseCandidate(candidate);
    const classification = classifyParsedCandidate(parsedCandidate);
    if (!classification) {
      throw new Error(`CSSX cannot classify utility "${candidate}" for composition.`);
    }
    const { recipe } = resolveParsedUtilityRecipe(candidate, parsedCandidate, classification, theme);
    compiled.set(candidate, {
      classification,
      atoms: recipe.atoms,
      atomSemantics: recipe.atoms.map((atom) => atomSemantics(atom, classification)),
    });
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
  const identities = canonicalCompositions.map((atomicClasses) => atomicClasses.join('\u0000'));
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
    /** Locates a candidate child by its exact sorted usage set. */
    const childIndexes = new Map(children.map((child, index) => [usageKey(child.compositionIndexes), index]));
    for (let leftIndex = 0; leftIndex < children.length; leftIndex++) {
      const left = children[leftIndex]!;
      const complement = complementIndexes(parent.compositionIndexes, left.compositionIndexes);
      const rightIndex = childIndexes.get(usageKey(complement));
      if (rightIndex === undefined || rightIndex <= leftIndex) {
        continue;
      }
      const right = children[rightIndex]!;
      omitted.add(parent);
      omitted.add(left);
      omitted.add(right);
      additions.push(
        reusableGroup([...parent.atomicClasses, ...left.atomicClasses].sort(), left.compositionIndexes),
        reusableGroup([...parent.atomicClasses, ...right.atomicClasses].sort(), right.compositionIndexes),
      );
      break;
    }
  }
  return [...groups.filter((group) => !omitted.has(group)), ...additions].sort(compareReusableGroups);
}

/** Returns the indexes from a sorted parent list that are absent from its sorted child list. */
function complementIndexes(parent: readonly number[], child: readonly number[]): readonly number[] {
  const complement: number[] = [];
  let childIndex = 0;
  for (const index of parent) {
    if (child[childIndex] === index) {
      childIndex++;
    } else {
      complement.push(index);
    }
  }
  return complement;
}

/** Serializes a sorted usage list for constant-time group lookups. */
function usageKey(indexes: readonly number[]): string {
  return indexes.join(',');
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
  /**
   * Every atom in this compilation shares a theme. A compact namespace avoids
   * repeatedly comparing the full token set while retaining random-name scope.
   */
  const themeIdentity = themeNamespace(serializeThemeSignature(theme));
  const symbols: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
  const symbolsByIdentity = atomSymbolsForAllocator(allocator);
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
      const identity = `${COMPILER_ABI}\u0000${themeIdentity}\u0000${classification.scope}\u0000${payload}`;
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

export { composeCompiledStyles };
export type { StyleComposition };
