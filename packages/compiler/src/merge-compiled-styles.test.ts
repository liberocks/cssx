import { expect, it } from 'vitest';

import type { CompiledStyle } from './compiled-style';
import { mergeCompiledStyles } from './merge-compiled-styles';

it('returns surviving classes from compiled styles in source order', () => {
  const styles: CompiledStyle[] = [
    {
      $$css: 2,
      c: 'first',
      _: [
        ['old', 'base', 'layout', 'layout'],
        ['color', 'base', 'color', 'color'],
      ],
    },
    {
      $$css: 2,
      c: 'second',
      _: [
        [null, 'base', 'layout', 'layout'],
        ['new', 'base', 'layout', 'layout'],
      ],
    },
  ];

  expect(mergeCompiledStyles(styles)).toBe('color new');
});

it('returns an empty class string when there are no surviving records', () => {
  const style: CompiledStyle = { $$css: 2, c: '', _: [[null, 'base', 'layout', 'layout']] };

  expect(mergeCompiledStyles([style])).toBe('');
});
