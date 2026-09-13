import type { CompiledUtility } from './compiled-utility';

/** A compiled style that contains utility records. */
export interface CompiledStyle {
  /** Marker used to identify a compiled CSSX style. */
  readonly $$css: 2;
  /** Composite class used when this style can be applied as one unit. */
  readonly c: string;
  /** Ordered utility records used by the runtime merge operation. */
  readonly _: readonly CompiledUtility[];
}
