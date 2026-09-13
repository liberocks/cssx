import type { CompiledStyle } from '@cssxio/compiler';
import { expect, it } from 'vitest';

import { markAllFallbackClasses } from './mark-all-fallback-classes';
import type { FileState } from './plugin-types';

it('marks fallback atoms across all styles in a style map', () => {
  const style = (className: string): CompiledStyle => ({
    $$css: 2,
    c: className,
    _: [[className, 'base', 'color']],
  });
  const state = {
    styles: new Map([['styles', { root: style('atom-one'), icon: style('atom-two') }]]),
    liveFallbackClasses: new Set<string>(),
  } as unknown as FileState;

  markAllFallbackClasses(state, 'styles');

  expect(state.liveFallbackClasses).toEqual(new Set(['atom-one', 'atom-two']));
});
