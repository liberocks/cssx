import type { ClassNameOptions, ClassNameAllocator } from './class-name';
import type { ReusabilityBudget } from './reusability';
import type { DarkMode } from './utility-variants';

/** Options for compiling style maps. */
export interface CompilerOptions {
  /** CSS theme input added to the default theme before compilation. */
  readonly theme?: string;
  /** Options that control generated atomic and composite class names. */
  readonly className?: ClassNameOptions;
  /** Shared allocator used to keep class names unique across compiler calls. */
  readonly classNameAllocator?: ClassNameAllocator;
  /** Controls how aggressively static styles share generated class fragments. */
  readonly reusabilityBudget?: ReusabilityBudget;
  /** Controls how the `dark` variant is activated. */
  readonly darkMode?: DarkMode;
}
