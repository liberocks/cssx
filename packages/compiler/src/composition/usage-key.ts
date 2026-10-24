/**
 * Serializes a sorted usage list for constant-time group lookups.
 *
 * @param indexes Sorted composition indexes to serialize.
 * @returns A delimited string that identifies the usage set.
 */
export function usageKey(indexes: readonly number[]): string {
  return indexes.join(',');
}
