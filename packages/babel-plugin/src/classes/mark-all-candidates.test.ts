import { expect, it } from 'vitest';

import { markAllCandidates } from './mark-all-candidates';

it('marks all style candidates as live', () => {
  const state = { liveCandidates: new Set<string>() };
  markAllCandidates(state as never, { first: ['p-2'], second: ['m-2'] });
  expect(state.liveCandidates).toEqual(new Set(['p-2', 'm-2']));
});
