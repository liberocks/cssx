import { expect, it } from 'vitest';

import { atomSymbolsForAllocator } from './atom-symbols-for-allocator';
import type { ClassNameAllocator } from './class-name';

const allocator = (): ClassNameAllocator => ({
  allocate: () => new Map(),
  reserve: () => undefined,
});

it('reuses the same symbolic atom map for a shared allocator', () => {
  const sharedAllocator = allocator();
  const first = atomSymbolsForAllocator(sharedAllocator);
  first.set('identity', 'a0');

  expect(atomSymbolsForAllocator(sharedAllocator)).toBe(first);
  expect(atomSymbolsForAllocator(sharedAllocator).get('identity')).toBe('a0');
});

it('creates an isolated symbolic atom map for each allocator', () => {
  const first = atomSymbolsForAllocator(allocator());
  const second = atomSymbolsForAllocator(allocator());

  expect(second).not.toBe(first);
  expect(second.size).toBe(0);
});
