import type { ClassNameAllocator, ClassNameAllocatorSnapshot } from './class-name';
import { createClassNameAllocator } from './class-name-allocator';
import { classNameAllocatorStates } from './class-name-allocator-state';

/**
 * Recreates a built-in allocator from a previously saved snapshot.
 *
 * @param snapshot JSON-safe allocator state.
 * @returns A usable allocator that retains every saved assignment.
 */
export function restoreClassNameAllocator(snapshot: ClassNameAllocatorSnapshot): ClassNameAllocator {
  if (snapshot.version !== 1 || !Number.isSafeInteger(snapshot.serialCounter) || snapshot.serialCounter < 0) {
    throw new Error('CSSX class-name allocator manifest has an unsupported or invalid format.');
  }
  const allocator = createClassNameAllocator(snapshot.options);
  const state = classNameAllocatorStates.get(allocator)!;
  for (const [identity, className] of snapshot.assignments) {
    if (typeof identity !== 'string' || typeof className !== 'string' || state.allocated.has(className)) {
      throw new Error('CSSX class-name allocator manifest contains duplicate or invalid assignments.');
    }
    state.classNames.set(identity, className);
    state.allocated.add(className);
  }
  for (const name of snapshot.reserved) {
    if (typeof name !== 'string' || state.allocated.has(name)) {
      throw new Error('CSSX class-name allocator manifest contains duplicate or invalid reserved names.');
    }
    state.allocated.add(name);
  }
  state.serialCounter = snapshot.serialCounter;
  return allocator;
}
