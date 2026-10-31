import type { CompiledStyle } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import { structuralClassesForStyle } from './structural-classes-for-style';

it('returns unique structural markers in their original order', () => {
  const style: CompiledStyle = {
    $$css: 2,
    c: 'composite group peer',
    _: [
      ['group', 'base', 'structural-group', 'structural-group'],
      ['atom', 'base', 'layout', 'layout'],
      ['peer', 'base', 'structural-peer', 'structural-peer'],
      ['group', 'base', 'structural-group', 'structural-group'],
      [null, 'base', 'structural-peer', 'structural-peer'],
    ],
  };

  expect(structuralClassesForStyle(style)).toEqual(['group', 'peer']);
});
