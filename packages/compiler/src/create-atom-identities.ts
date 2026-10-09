import { atomSymbolsForAllocator } from './atom-symbols-for-allocator';
import { type ClassNameAllocator } from './class-name';
import { type CompiledCandidate } from './compile-candidates';
import { COMPILER_ABI } from './compiler-abi';
import { hashClassNameIdentity } from './hash-class-name-identity';
import { serializeThemeSignature } from './serialize-theme-signature';
import type { parseTheme } from './theme';
import { themeNamespace } from './theme-namespace';

/**
 * Creates deterministic symbolic atom identities from emitted declarations.
 *
 * This keeps identical CSS stable across input order and gives atomized utilities
 * separate identities, allowing emitted composites to be allocated first.
 *
 * @param candidates Utility candidates to name.
 * @param theme Parsed theme that affects declarations.
 * @param compiledCandidates Resolved recipes used to derive each atom identity.
 * @param allocator Allocator that owns the shared symbolic namespace.
 * @returns Atom identities for every distinct candidate.
 */
export function createAtomIdentities(
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
      let symbol = symbolsByIdentity.get(identity);
      if (!symbol) {
        // These symbols participate in composition identity, so deriving them
        // from encounter order makes independent compiler processes disagree.
        const base = `a${hashClassNameIdentity(identity)}`;
        const owners = new Map(
          [...symbolsByIdentity].map(([knownIdentity, knownSymbol]) => [knownSymbol, knownIdentity]),
        );
        symbol = base;
        for (let attempt = 1; owners.has(symbol) && owners.get(symbol) !== identity; attempt++) {
          symbol = `${base}-${hashClassNameIdentity(`${identity}\\u0000${attempt}`)}`;
        }
        symbolsByIdentity.set(identity, symbol);
      }
      allocationIdentities.set(symbol, identity);
      return symbol;
    });
  }
  return { symbols, allocationIdentities };
}
