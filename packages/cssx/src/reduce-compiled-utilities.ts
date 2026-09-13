import type { CompiledUtility } from './types';

/**
 * Removes records replaced by later records in the same style group.
 *
 * @param records Compiler-created utility records.
 * @returns The records that should remain, in their original order.
 */
export function reduceCompiledUtilities(records: readonly CompiledUtility[]): readonly CompiledUtility[] {
  const blocked = new Map<string, Set<string>>();
  const output: CompiledUtility[] = [];
  for (let index = records.length - 1; index >= 0; index--) {
    const record = records[index];
    if (!record) {
      continue;
    }
    const scope = blocked.get(record[1]) ?? new Set<string>();
    blocked.set(record[1], scope);
    if (record[0] !== null && scope.has(record[2])) {
      continue;
    }
    for (let conflict = 2; conflict < record.length; conflict++) {
      const group = record[conflict];
      if (group) {
        scope.add(group);
      }
    }
    if (record[0] !== null) {
      output.push(record);
    }
  }
  return output.reverse();
}
