import { expect, it } from 'vitest';

import { createClassNameAllocator } from './class-name-allocator';

it('allocates serial names in canonical order and preserves prior identities', () => {
  const allocator = createClassNameAllocator({ variant: 'serial', prefix: 'u-', suffix: '-x' });

  expect([...allocator.allocate(['b', 'a', 'a'])]).toEqual([
    ['b', 'u-1-x'],
    ['a', 'u-0-x'],
  ]);
  expect([...allocator.allocate(['a', 'c'])]).toEqual([
    ['a', 'u-0-x'],
    ['c', 'u-2-x'],
  ]);
});

it('uses decimal serial names without affixes and probes reserved names', () => {
  const allocator = createClassNameAllocator({ prefix: '', suffix: '' });
  expect([...allocator.allocate(['a', 'b'])]).toEqual([
    ['a', '0'],
    ['b', '1'],
  ]);

  allocator.reserve(['2']);
  expect(allocator.allocate(['c']).get('c')).toBe('3');
  expect(allocator.allocate([])).toEqual(new Map());
});

it('probes reserved random names and generates fixed-length fragments', () => {
  const firstAllocator = createClassNameAllocator({ variant: 'random', prefix: '', suffix: '' });
  const firstName = firstAllocator.allocate(['entry']).get('entry')!;
  const retryAllocator = createClassNameAllocator({ variant: 'random', prefix: '', suffix: '' });
  retryAllocator.reserve([firstName]);
  expect(retryAllocator.allocate(['entry']).get('entry')).not.toBe(firstName);

  const fixedLength = createClassNameAllocator({ variant: 'random', prefix: '', suffix: '', length: 4 });
  expect(fixedLength.allocate(['entry']).get('entry')).toMatch(/^[0-9a-z]{4}$/);
});

it('rejects an allocation when fixed-length random names cannot fit', () => {
  const allocator = createClassNameAllocator({ variant: 'random', prefix: '', suffix: '', length: 1 });
  allocator.reserve(Array.from({ length: 36 }, (_, index) => index.toString(36)));

  expect(() => allocator.allocate(['overflow'])).toThrow('cannot name every generated class');
});
