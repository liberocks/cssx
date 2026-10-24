import type { ClassNameAllocator } from './class-name';

/** Class names allocated for the candidates in a collection of style maps. */
export interface StyleMapClassNames {
  /** Symbolic atom name to allocated CSS class name. */
  readonly allocatedAtomClasses: ReadonlyMap<string, string>;
  /** Generated atom class names keyed by candidate. */
  readonly classNames: Readonly<Record<string, readonly string[]>>;
  /** Joined generated atom classes keyed by candidate. */
  readonly classes: Readonly<Record<string, string>>;
}

/**
 * Allocates atom classes and resolves candidate class names from atom symbols.
 *
 * @param symbols Candidate atom symbols keyed by candidate.
 * @param allocationIdentities Full allocation identities keyed by symbol.
 * @param allocator Shared allocator for this style-map compilation.
 * @returns Allocated atom names and joined candidate classes.
 */
export function allocateStyleMapClassNames(
  symbols: Readonly<Record<string, readonly string[]>>,
  allocationIdentities: ReadonlyMap<string, string>,
  allocator: ClassNameAllocator,
): StyleMapClassNames {
  const allocatedAtoms = allocator.allocate([...allocationIdentities.values()]);
  /** Resolves compact atom symbols without repeatedly looking up full allocation identities. */
  const allocatedAtomClasses = new Map<string, string>();
  for (const [symbol, identity] of allocationIdentities) {
    allocatedAtomClasses.set(symbol, allocatedAtoms.get(identity)!);
  }
  const classNames: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
  const classes: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [candidate, candidateSymbols] of Object.entries(symbols)) {
    const names = candidateSymbols.map((symbol) => allocatedAtomClasses.get(symbol)!);
    classNames[candidate] = names;
    classes[candidate] = names.join(' ');
  }
  return { allocatedAtomClasses, classNames, classes };
}
