import type { NormalizedClassNameOptions } from './normalize-class-name-options';

/** Mutable state shared by one generated class-name allocator. */
export interface ClassNameAllocationState {
  /** Validated class naming options shared by each allocation operation. */
  readonly naming: NormalizedClassNameOptions;
  /** Stable class names already assigned to identities. */
  readonly classNames: Map<string, string>;
  /** Class names unavailable for new identities. */
  readonly allocated: Set<string>;
  /** Counter used to generate deterministic serial fragments. */
  serialCounter: number;
}
