/** Style groups that one utility writes and clears. */
export interface UtilityConflictRecord {
  /** Variant and importance scope where this record applies. */
  readonly scope: string;
  /** Semantic write group owned by the utility. */
  readonly group: string;
  /** Groups cleared when this utility is applied later. */
  readonly conflicts: readonly string[];
}
