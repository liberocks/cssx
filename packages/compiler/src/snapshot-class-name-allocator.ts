import type { ClassNameAllocator, ClassNameAllocatorSnapshot } from './class-name';
import { classNameAllocatorStates } from './class-name-allocator-state';

/**
 * Saves built-in allocator state for reuse by another compiler process.
 *
 * @param allocator Allocator created by `createClassNameAllocator`.
 * @returns A JSON-safe snapshot.
 */
export function snapshotClassNameAllocator(allocator: ClassNameAllocator): ClassNameAllocatorSnapshot {
  const state = classNameAllocatorStates.get(allocator);
  if (!state) {
    throw new Error('CSSX can only snapshot allocators created by createClassNameAllocator().');
  }
  const assignedNames = new Set(state.classNames.values());
  return {
    version: 1,
    options: { ...state.naming },
    serialCounter: state.serialCounter,
    assignments: [...state.classNames.entries()],
    reserved: [...state.allocated].filter((name) => !assignedNames.has(name)),
  };
}
