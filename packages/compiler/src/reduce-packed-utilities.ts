import type { CompiledUtility } from './compiled-utility';

/**
 * Removes utility records superseded by later records in the same scope.
 *
 * @param records Ordered packed utility records.
 * @returns Winning class-bearing records in their original order.
 */
export function reducePackedUtilities(records: readonly CompiledUtility[]): readonly CompiledUtility[] {
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
      blocked.add(record[conflictIndex]!);
    }
    if (record[0]) {
      output.push(record);
    }
  }
  return output.reverse();
}
