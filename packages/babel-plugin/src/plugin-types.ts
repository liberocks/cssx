import type { ClassNameAllocator, ClassNameOptions, CompiledStyle, ReusabilityBudget } from '@cssxio/compiler';

/** Options that control how the CSSX compiler plugin finds and compiles calls. */
export interface CssxPluginOptions {
  /** Module specifier that exports the CSSX runtime. */
  readonly importSource?: string;
  /** CSS text containing the theme used to compile utilities. */
  readonly theme?: string;
  /** Options that control generated class names. */
  readonly className?: ClassNameOptions;
  /** Shared allocator used by a bundler to name classes across source modules. */
  readonly classNameAllocator?: ClassNameAllocator;
  /** Controls how aggressively static styles share generated class fragments. */
  readonly reusabilityBudget?: ReusabilityBudget;
  /** Uses source-addressed composite names for development stylesheet updates. */
  readonly stableClassNames?: boolean;
}

/** Per-file data collected while the plugin transforms one source module. */
export interface FileState {
  /** Allocator shared by all CSSX calls transformed in this source module. */
  readonly classNameAllocator: ClassNameAllocator;
  /** Compiled styles stored by the local variable that received a create call. */
  readonly styles: Map<string, Readonly<Record<string, CompiledStyle>>>;
  /** Source candidates stored by style key for each local styles variable. */
  readonly styleCandidates: Map<string, Readonly<Record<string, readonly string[]>>>;
  /** Composite class stored by style key for each local styles variable. */
  readonly styleClasses: Map<string, Readonly<Record<string, string>>>;
  /** Generated class name for each source candidate seen in this module. */
  readonly classes: Map<string, string>;
  /** First source location recorded for each source candidate. */
  readonly candidateOrigins: Map<string, { readonly line: number; readonly column: number }>;
  /** Candidates that remain reachable from transformed source code. */
  readonly liveCandidates: Set<string>;
  /** Winning atomic classes keyed by every composite class seen in this module. */
  readonly composites: Map<string, readonly string[]>;
  /** Composite classes that remain reachable from transformed source code. */
  readonly liveComposites: Set<string>;
  /** Atomic classes emitted directly or required by compiled runtime styles. */
  readonly liveFallbackClasses: Set<string>;
  /** Ranges containing CSSX utility strings, used to identify CSS-only edits. */
  readonly cssRanges: { readonly start: number; readonly end: number }[];
}
