import { expect, it } from 'vitest';
import type { FileState } from './plugin-types';
import { markAllStyleClasses } from './mark-all-style-classes';

it('marks every composite and atom in the referenced style map as reachable', () => {
  const state = {
    styleClasses: new Map([['styles', { root: 'composite', icon: 'fallback' }]]),
    composites: new Map([['composite', ['atom']]]),
    liveComposites: new Set<string>(),
    liveFallbackClasses: new Set<string>(),
  } as unknown as FileState;

  markAllStyleClasses(state, 'styles');

  expect(state.liveComposites).toEqual(new Set(['composite']));
  expect(state.liveFallbackClasses).toEqual(new Set(['fallback']));
});
