import { expect, it } from 'vitest';

import { markEmittedClassNames } from './mark-emitted-class-names';
import type { FileState } from './plugin-types';

it('tracks composite names and fallback atoms while ignoring extra whitespace', () => {
  const state = {
    composites: new Map([['composite', ['atom']]]),
    liveComposites: new Set<string>(),
    liveFallbackClasses: new Set<string>(),
  } as unknown as FileState;

  markEmittedClassNames(' composite   atom ', state);

  expect(state.liveComposites).toEqual(new Set(['composite']));
  expect(state.liveFallbackClasses).toEqual(new Set(['atom']));
});
