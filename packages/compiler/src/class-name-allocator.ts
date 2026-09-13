import { allocateClassNames } from './allocate-class-names';
import type { ClassNameAllocator, ClassNameOptions } from './class-name';
import type { ClassNameAllocationState } from './class-name-allocation-state';
import { normalizeClassNameOptions } from './normalize-class-name-options';
import { reserveClassNames } from './reserve-class-names';

/**
 * Creates a stateful allocator for unique generated class names.
 *
 * @param options User-supplied naming options.
 * @returns An allocator that preserves identity assignments and reserved names.
 */
export function createClassNameAllocator(options: ClassNameOptions = {}): ClassNameAllocator {
  const state: ClassNameAllocationState = {
    naming: normalizeClassNameOptions(options),
    classNames: new Map(),
    allocated: new Set(),
    serialCounter: 0,
  };

  return {
    allocate: allocateClassNames.bind(undefined, state),
    reserve: reserveClassNames.bind(undefined, state),
  };
}
