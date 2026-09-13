import type { ClassNameAllocator, ClassNameOptions } from './class-name';
import type { ReusabilityBudget } from './reusability';

/** Options for creating compiled style records. */
export interface StyleCompilerOptions {
  /** CSS theme input used when generating class names. */
  readonly theme?: string;
  /** Options that control generated atomic and composite class names. */
  readonly className?: ClassNameOptions;
  /** Shared allocator used to keep class names unique across compiler calls. */
  readonly classNameAllocator?: ClassNameAllocator;
  /** Controls how aggressively static styles share generated class fragments. */
  readonly reusabilityBudget?: ReusabilityBudget;
}
