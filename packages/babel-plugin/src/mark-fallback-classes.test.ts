import type { CompiledStyle } from '@cssxio/compiler';
import { expect, it } from 'vitest';
import type { FileState } from './plugin-types';
import { markFallbackClasses } from './mark-fallback-classes';

it('marks non-null atom names for one style and tolerates missing style data', () => {
  const style: CompiledStyle = {
    $$css: 2,
    c: 'composite',
    _: [
      ['atom', 'base', 'padding'],
      [null, 'base', 'margin'],
    ],
  };
  const state = {
    styles: new Map([['styles', { root: style }]]),
    liveFallbackClasses: new Set<string>(),
  } as unknown as FileState;

  markFallbackClasses(state, 'styles', 'root');
  markFallbackClasses(state, 'styles', 'missing');

  expect(state.liveFallbackClasses).toEqual(new Set(['atom']));
});
