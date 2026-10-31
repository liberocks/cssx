import type { CompiledStyle } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import { atomicClassesForStyle } from './atomic-classes-for-style';

it('returns unique non-null atomic classes in record order', () => {
  const style: CompiledStyle = {
    $$css: 2,
    c: 'composite',
    _: [
      ['atom-one', 'base', 'padding'],
      ['atom-one', 'base', 'padding'],
      [null, 'base', 'margin'],
      ['atom-two', 'base', 'color'],
      ['group', 'base', 'structural-group', 'structural-group'],
    ],
  };
  expect(atomicClassesForStyle(style)).toEqual(['atom-one', 'atom-two']);
});
