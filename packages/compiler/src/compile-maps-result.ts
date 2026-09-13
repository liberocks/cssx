import { CompiledStyleRecordMap } from './compiled-style-record-maps';
import { CssxRule } from './cssx-rule';

/** The output from several compiled style maps. */
export interface CompileMapsResult {
  /** Compiled results keyed by the input map name. */
  readonly styleMaps: Readonly<Record<string, CompiledStyleRecordMap>>;
  /** Shared CSS rules generated across every input map. */
  readonly rules: readonly CssxRule[];
}
