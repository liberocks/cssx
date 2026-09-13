import { expect, it } from 'vitest';

import { createClassNameAllocator } from './class-name-allocator';
import type { CompiledStyle } from './compiled-style';
import { composeCompiledStyles } from './compose-compiled-styles';

it('returns an empty composition for styles without utility records', () => {
  expect(composeCompiledStyles([])).toEqual({ className: '', atomicClasses: [] });
});

it('reduces conflicting records and allocates a composite with the shared allocator', () => {
  const first: CompiledStyle = {
    $$css: 2,
    c: 'first',
    _: [
      ['old', 'base', 'layout', 'layout'],
      ['color', 'base', 'color', 'color'],
    ],
  };
  const second: CompiledStyle = {
    $$css: 2,
    c: 'second',
    _: [
      [null, 'base', 'layout', 'layout'],
      ['new', 'base', 'layout', 'layout'],
    ],
  };
  const allocator = createClassNameAllocator({ prefix: '', suffix: '' });

  expect(composeCompiledStyles([first, second], allocator)).toEqual({
    className: '0',
    atomicClasses: ['color', 'new'],
  });
  expect(allocator.allocate(['after']).get('after')).toBe('1');
});
