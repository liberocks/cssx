import { expect, it } from 'vitest';

import { createClassNameAllocator } from './class-name-allocator';
import { restoreClassNameAllocator } from './restore-class-name-allocator';
import { snapshotClassNameAllocator } from './snapshot-class-name-allocator';

it('restores serial assignments, reservations, and the next serial number', () => {
  const first = createClassNameAllocator({ prefix: 'u', suffix: '' });
  expect(first.allocate(['padding', 'color'])).toEqual(
    new Map([
      ['padding', 'u1'],
      ['color', 'u0'],
    ]),
  );
  first.reserve(['outside']);

  const restored = restoreClassNameAllocator(JSON.parse(JSON.stringify(snapshotClassNameAllocator(first))));
  expect(restored.allocate(['padding', 'color', 'width'])).toEqual(
    new Map([
      ['padding', 'u1'],
      ['color', 'u0'],
      ['width', 'u2'],
    ]),
  );
  expect(restored.allocate(['new']).get('new')).not.toBe('outside');
});

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
