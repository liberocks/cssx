/** One reusable fragment emitted by a reusability plan. */
export interface ReusableFragment {
  readonly className: string;
  readonly atomicClasses: readonly string[];
}

/** Final class strings and selector aliases selected for static compositions. */
export interface ReusabilityPlan {
  readonly classNames: ReadonlyMap<string, string>;
  readonly fragments: ReadonlyMap<string, readonly ReusableFragment[]>;
}

/** Candidate group of atoms that always appears in the same style entries. */
export interface ReusableGroup {
  readonly atomicClasses: readonly string[];
  readonly compositionIndexes: readonly number[];
  readonly coverage: number;
  readonly score: number;
}

/** Percentage of winning atomic occurrences eligible for reusable fragments. */
export type ReusabilityBudget = number | 'auto';
