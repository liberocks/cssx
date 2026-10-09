import { expect, it } from 'vitest';

import { createClassNameAllocator } from './class-name-allocator';
import { classNameAllocatorStates } from './class-name-allocator-state';

it('retains built-in allocator state by allocator identity', () => {
  const allocator = createClassNameAllocator();
  allocator.allocate(['identity']);

  expect(classNameAllocatorStates.get(allocator)?.classNames.get('identity')).toBe('s0x');
});
