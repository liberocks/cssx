import { expect, it } from 'vitest';
import { markStyleKeyCandidates } from './mark-style-key-candidates';

it('marks candidates for the selected style key', () => {
  const state = { liveCandidates: new Set<string>() };
  markStyleKeyCandidates(state as never, { first: ['p-2'] }, 'first');
  expect(state.liveCandidates).toEqual(new Set(['p-2']));
});
