import { expect, it } from 'vitest';

import type { ClassNameAllocationState } from './class-name-allocation-state';
import { normalizeClassNameOptions } from './normalize-class-name-options';
import { reserveClassNames } from './reserve-class-names';

it('adds external names to the allocator collision set', () => {
  const state: ClassNameAllocationState = {
    naming: normalizeClassNameOptions({ prefix: '', suffix: '' }),
    classNames: new Map(),
    allocated: new Set(),
    serialCounter: 0,
  };

  reserveClassNames(state, ['external', 'external']);

  expect(state.allocated).toEqual(new Set(['external']));
});
