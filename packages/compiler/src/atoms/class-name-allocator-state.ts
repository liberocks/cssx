import type { ClassNameAllocator } from './class-name';
import type { ClassNameAllocationState } from './class-name-allocation-state';

/** Allocator state captured for persistence by built-in allocator instances. */
export const classNameAllocatorStates = new WeakMap<ClassNameAllocator, ClassNameAllocationState>();
