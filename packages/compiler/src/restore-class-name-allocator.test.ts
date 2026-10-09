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
