import type { CompiledUtility } from './conflicts';

/**
 * Extracts the atomic classes that survive a runtime composition.
 *
 * @param records Ordered packed utility records.
 * @returns Winning atomic classes in their source order.
 */
export function packedAtomicClasses(records: readonly CompiledUtility[]): readonly string[] {
  const blockedByScope = new Map<string, Set<string>>();
  const atomicClasses: string[] = [];
  for (let index = records.length - 1; index >= 0; index--) {
    const record = records[index]!;
    const blocked = blockedByScope.get(record[1]) ?? new Set<string>();
    blockedByScope.set(record[1], blocked);
    if (record[0] !== null && blocked.has(record[2])) {
      continue;
    }
    for (let conflictIndex = 2; conflictIndex < record.length; conflictIndex++) {
      blocked.add(record[conflictIndex]!);
    }
    if (record[0]) {
      atomicClasses.push(record[0]);
    }
  }
  return atomicClasses.reverse();
}
