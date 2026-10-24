/** Style groups used to merge one utility with later utilities. */
export interface UtilitySemantics {
  /** Variant and importance scope where the utility writes. */
  readonly scope: string;
  /** Primary semantic group owned by the utility. */
  readonly group: string;
  /** Groups the utility clears when it is applied later. */
  readonly conflicts: readonly string[];
}
