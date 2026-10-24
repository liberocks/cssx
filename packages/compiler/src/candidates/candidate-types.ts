/** Parsed parts of one supported static utility candidate. */
export interface ParsedCandidate {
  /** Original unmodified candidate string. */
  readonly raw: string;
  /** Ordered selector and responsive variants. */
  readonly variants: readonly string[];
  /** Utility name without variants, importance, or negation. */
  readonly utility: string;
  /** Whether declarations must use `!important`. */
  readonly important: boolean;
  /** Whether the utility value is negative. */
  readonly negative: boolean;
}
