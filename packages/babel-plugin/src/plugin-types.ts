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
