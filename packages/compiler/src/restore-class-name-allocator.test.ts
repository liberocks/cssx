import { expect, it } from 'vitest';

import { restoreClassNameAllocator } from './restore-class-name-allocator';

it('rejects duplicate snapshot assignments', () => {
  expect(() =>
    restoreClassNameAllocator({
      version: 1,
      options: {},
      serialCounter: 0,
      assignments: [
        ['a', 's0x'],
        ['b', 's0x'],
      ],
      reserved: [],
    }),
  ).toThrow('duplicate or invalid assignments');
});

it.each([
  [{ version: 2, options: {}, serialCounter: 0, assignments: [], reserved: [] }, 'unsupported or invalid format'],
  [
    { version: 1, options: {}, serialCounter: Number.NaN, assignments: [], reserved: [] },
    'unsupported or invalid format',
  ],
  [{ version: 1, options: {}, serialCounter: -1, assignments: [], reserved: [] }, 'unsupported or invalid format'],
  [
    { version: 1, options: {}, serialCounter: 0, assignments: [[null, 's0x']], reserved: [] },
    'duplicate or invalid assignments',
  ],
  [
    { version: 1, options: {}, serialCounter: 0, assignments: [['a', null]], reserved: [] },
    'duplicate or invalid assignments',
  ],
  [
    { version: 1, options: {}, serialCounter: 0, assignments: [], reserved: [null] },
    'duplicate or invalid reserved names',
  ],
  [
    { version: 1, options: {}, serialCounter: 0, assignments: [['a', 's0x']], reserved: ['s0x'] },
    'duplicate or invalid reserved names',
  ],
] as const)('rejects malformed allocator snapshots', (snapshot, message) => {
  expect(() => restoreClassNameAllocator(snapshot as never)).toThrow(message);
});
