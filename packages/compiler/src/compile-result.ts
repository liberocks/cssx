import { CompiledStyle } from './compiled-style';
import { CssxRule } from './cssx-rule';

/** The output from one compiled style map. */
export interface CompileResult {
  /** Compiled runtime styles keyed by the input style name. */
  readonly styles: Readonly<Record<string, CompiledStyle>>;
  /** CSS rules generated for all candidates in this input. */
  readonly rules: readonly CssxRule[];
  /** Generated class names keyed by source candidate. */
  readonly classes: Readonly<Record<string, string>>;
  /** Parsed source candidates keyed by input style name. */
  readonly candidates: Readonly<Record<string, readonly string[]>>;
  /** Composite class names keyed by input style name. */
  readonly classNames: Readonly<Record<string, string>>;
  /** Winning atomic classes keyed by composite class name. */
  readonly composites: Readonly<Record<string, readonly string[]>>;
}
