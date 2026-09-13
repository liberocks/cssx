import type { ClassNameAllocationState } from './class-name-allocation-state';

/** Marks names allocated by another compilation as unavailable for this allocator. */
export function reserveClassNames(state: ClassNameAllocationState, classNames: readonly string[]): void {
  for (const className of classNames) {
    state.allocated.add(className);
  }
}
