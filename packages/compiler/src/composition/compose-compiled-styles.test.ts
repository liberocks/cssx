import { expect, it } from 'vitest';

import { createClassNameAllocator } from '../atoms/class-name-allocator';
import type { CompiledStyle } from '../shared/compiled-style';
import { composeCompiledStyles } from './compose-compiled-styles';

it('returns an empty composition for styles without utility records', () => {
  expect(composeCompiledStyles([])).toEqual({
    className: '',
    compositeClassName: '',
    atomicClasses: [],
    structuralClasses: [],
  });
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
    compositeClassName: '0',
    atomicClasses: ['color', 'new'],
    structuralClasses: [],
  });
  expect(allocator.allocate(['after']).get('after')).toBe('1');
});

it('keeps structural markers in the result but outside composite selector aliases', () => {
  const style: CompiledStyle = {
    $$css: 2,
    c: 'style-alias group',
    _: [
      ['atom-one', 'base', 'color', 'color'],
      ['group', 'base', 'structural-group', 'structural-group'],
    ],
  };
  const allocator = createClassNameAllocator({ prefix: '', suffix: '' });

  expect(composeCompiledStyles([style], allocator)).toEqual({
    className: '0 group',
    compositeClassName: '0',
    atomicClasses: ['atom-one'],
    structuralClasses: ['group'],
  });
});

it('returns structural markers when a composition contains no declaration atoms', () => {
  const style: CompiledStyle = {
    $$css: 2,
    c: 'group',
    _: [['group', 'base', 'structural-group', 'structural-group']],
  };

  expect(composeCompiledStyles([style])).toEqual({
    className: 'group',
    compositeClassName: '',
    atomicClasses: [],
    structuralClasses: ['group'],
  });
});
