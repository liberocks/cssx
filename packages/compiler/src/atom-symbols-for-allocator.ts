import type { ClassNameAllocator } from './conflicts';

/** Symbol maps retained for each allocator while compiler calls share it. */
const atomSymbolsByAllocator = new WeakMap<object, Map<string, string>>();

/**
 * Returns the symbolic atom namespace associated with one allocator.
 *
 * @param allocator Allocator that owns the symbolic namespace.
 * @returns A stable symbol map for that allocator.
 */
export function atomSymbolsForAllocator(allocator: ClassNameAllocator): Map<string, string> {
  const key = allocator as object;
  const existing = atomSymbolsByAllocator.get(key);
  if (existing) {
    return existing;
  }
  const symbols = new Map<string, string>();
  atomSymbolsByAllocator.set(key, symbols);
  return symbols;
}
