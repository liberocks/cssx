import { expect, it } from 'vitest';

import { allocateClassNames } from './allocate-class-names';
import type { ClassNameAllocationState } from './class-name-allocation-state';
import { normalizeClassNameOptions } from './normalize-class-name-options';

/** Creates isolated allocator state for direct allocation tests. */
function allocationState(options: Parameters<typeof normalizeClassNameOptions>[0] = {}): ClassNameAllocationState {
  return {
    naming: normalizeClassNameOptions(options),
    classNames: new Map(),
    allocated: new Set(),
    serialCounter: 0,
  };
}

it('allocates canonical serial names and returns mappings in input order', () => {
  const state = allocationState({ variant: 'serial', prefix: 'u-', suffix: '-x' });

  expect([...allocateClassNames(state, ['b', 'a', 'a'])]).toEqual([
    ['b', 'u-1-x'],
    ['a', 'u-0-x'],
  ]);
  expect([...allocateClassNames(state, ['a', 'c'])]).toEqual([
    ['a', 'u-0-x'],
    ['c', 'u-2-x'],
  ]);
});

it('uses plain decimal serial names and probes names already in use', () => {
  const state = allocationState({ prefix: '', suffix: '' });
  state.allocated.add('0');

  expect([...allocateClassNames(state, ['a', 'b'])]).toEqual([
    ['a', '1'],
    ['b', '2'],
  ]);
  expect(allocateClassNames(state, [])).toEqual(new Map());
});

it('probes random collisions and respects fixed fragment lengths', () => {
  const first = allocationState({ variant: 'random', prefix: '', suffix: '' });
  const firstName = allocateClassNames(first, ['entry']).get('entry')!;
  const retry = allocationState({ variant: 'random', prefix: '', suffix: '' });
  retry.allocated.add(firstName);

  expect(allocateClassNames(retry, ['entry']).get('entry')).not.toBe(firstName);

  const fixedLength = allocationState({ variant: 'random', prefix: '', suffix: '', length: 4 });
  expect(allocateClassNames(fixedLength, ['entry']).get('entry')).toMatch(/^[0-9a-z]{4}$/);
});

it('rejects fixed-length allocations when remaining names cannot fit', () => {
  const state = allocationState({ variant: 'random', prefix: '', suffix: '', length: 1 });
  for (let index = 0; index < 36; index++) {
    state.allocated.add(index.toString(36));
  }

  expect(() => allocateClassNames(state, ['overflow'])).toThrow('cannot name every generated class');
});
