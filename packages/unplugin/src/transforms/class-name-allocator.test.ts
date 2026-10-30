import { createClassNameAllocator as createCompilerAllocator } from '@cssxio/compiler';
import type { ClassNameOptions } from '@cssxio/compiler';
import { describe, expect, it } from 'vitest';

import { createClassNameAllocator } from './class-name-allocator';

describe('createClassNameAllocator', () => {
  it('keeps canonical sorted allocations equivalent to unordered inputs', () => {
    const canonical = createClassNameAllocator();
    const unordered = createClassNameAllocator();

    expect(Object.fromEntries(canonical.allocate(['a', 'b', 'c']))).toEqual(
      Object.fromEntries(unordered.allocate(['c', 'a', 'b'])),
    );
  });

  it.each([
    undefined,
    {},
    { variant: 'serial' as const },
    { variant: 'random' as const },
    { variant: 'random' as const, length: 4 },
  ])('matches the compiler allocator for %o', (options) => {
    const local = createClassNameAllocator(options);
    const compiler = createCompilerAllocator(options);
    const identities = ['padding', 'color', 'width', 'padding'];
    expect([...local.allocate(identities)]).toEqual([...compiler.allocate(identities)]);
    local.reserve(['reserved']);
    compiler.reserve(['reserved']);
    expect([...local.allocate(['after'])]).toEqual([...compiler.allocate(['after'])]);
  });

  it('retries serial collisions and retains allocated names', () => {
    const allocator = createClassNameAllocator();
    allocator.reserve(['s0x']);
    expect([...allocator.allocate(['first', 'second'])]).toEqual([
      ['first', 's1x'],
      ['second', 's2x'],
    ]);
    expect([...allocator.allocate(['first'])]).toEqual([['first', 's1x']]);
  });

  it('uses numeric serial fragments when both affixes are empty', () => {
    const allocator = createClassNameAllocator({ prefix: '', suffix: '' });

    expect([...allocator.allocate(['first', 'second'])]).toEqual([
      ['first', '0'],
      ['second', '1'],
    ]);
  });

  it('retries random collisions and enforces short-name capacity', () => {
    const original = createClassNameAllocator({ variant: 'random' });
    const reservedName = original.allocate(['identity']).get('identity')!;
    const allocator = createClassNameAllocator({ variant: 'random' });
    allocator.reserve([reservedName]);
    expect(allocator.allocate(['identity']).get('identity')).not.toBe(reservedName);

    const shortNames = createClassNameAllocator({ variant: 'random', length: 1 });
    expect(() => shortNames.allocate(Array.from({ length: 37 }, (_, index) => `identity-${index}`))).toThrow(
      'cannot name every generated class',
    );
  });

  const invalidOptions: readonly [ClassNameOptions, string][] = [
    [{ variant: 'other' as never }, 'variant'],
    [{ prefix: '.' }, 'prefix'],
    [{ suffix: '.' }, 'suffix'],
    [{ variant: 'random', length: 0 }, 'length'],
    [{ variant: 'serial', length: 2 }, 'only supported'],
  ];

  it.each(invalidOptions)('rejects invalid options %o', (options, message) => {
    expect(() => createClassNameAllocator(options)).toThrow(message);
  });
});
