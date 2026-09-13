import { expect, it } from 'vitest';

import { allocateStyleMapClassNames } from './allocate-style-map-class-names';
import { createClassNameAllocator } from './class-name-allocator';

it('allocates shared atom identities once and joins them by candidate', () => {
  const result = allocateStyleMapClassNames(
    { padding: ['atom-a'], horizontalPadding: ['atom-a', 'atom-b'] },
    new Map([
      ['atom-a', 'padding-declaration'],
      ['atom-b', 'horizontal-declaration'],
    ]),
    createClassNameAllocator({ variant: 'serial', prefix: 'u-' }),
  );

  expect(result.allocatedAtomClasses.get('atom-a')).toBe('u-1x');
  expect(result.allocatedAtomClasses.get('atom-b')).toBe('u-0x');
  expect(result.classNames).toEqual({ padding: ['u-1x'], horizontalPadding: ['u-1x', 'u-0x'] });
  expect(result.classes).toEqual({ padding: 'u-1x', horizontalPadding: 'u-1x u-0x' });
});

it('keeps candidates with no atoms as empty class strings', () => {
  const result = allocateStyleMapClassNames(
    { noop: [] },
    new Map(),
    createClassNameAllocator({ variant: 'serial', prefix: 'u-' }),
  );

  expect(result.classNames).toEqual({ noop: [] });
  expect(result.classes).toEqual({ noop: '' });
});
