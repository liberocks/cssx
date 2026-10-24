/** Options that control generated CSS class names. */
export interface ClassNameOptions {
  /** Naming algorithm. Defaults to `serial`; `random` is a stable content hash. */
  readonly variant?: 'random' | 'serial';
  /** Text prepended to every generated class. Defaults to `s`. */
  readonly prefix?: string;
  /** Text appended to every generated class. Defaults to `x`. */
  readonly suffix?: string;
  /** Length of the hash fragment when `variant` is `random`. */
  readonly length?: number;
}

/** Stateful allocator that keeps generated classes unique across compiler calls. */
export interface ClassNameAllocator {
  /** Allocates one unique class for every supplied identity. */
  allocate(identities: readonly string[]): ReadonlyMap<string, string>;
  /** Reserves class names that were allocated outside this allocator. */
  reserve(classNames: readonly string[]): void;
}

/** JSON-safe snapshot of a built-in class-name allocator. */
export interface ClassNameAllocatorSnapshot {
  readonly version: 1;
  readonly options: ClassNameOptions;
  readonly serialCounter: number;
  readonly assignments: readonly (readonly [identity: string, className: string])[];
  readonly reserved: readonly string[];
}
