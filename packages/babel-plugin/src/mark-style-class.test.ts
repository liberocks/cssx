import { expect, it } from 'vitest';

import { markStyleClass } from './mark-style-class';
import type { FileState } from './plugin-types';

it('marks an existing style composite as reachable and ignores a missing key', () => {
  const state = {
    styleClasses: new Map([['styles', { root: 'composite' }]]),
    composites: new Map([['composite', ['atom']]]),
    liveComposites: new Set<string>(),
    liveFallbackClasses: new Set<string>(),
  } as unknown as FileState;

  markStyleClass(state, 'styles', 'root');
  markStyleClass(state, 'styles', 'missing');

  expect(state.liveComposites).toEqual(new Set(['composite']));
  expect(state.liveFallbackClasses).toEqual(new Set());
});
