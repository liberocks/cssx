import { expect, it } from 'vitest';

import { recordCandidateOrigin } from './record-candidate-origin';

it('stores the first candidate origin with a zero-based line', () => {
  const state = { candidateOrigins: new Map() };
  recordCandidateOrigin(state as never, 'p-2', { line: 2, column: 3 });
  expect(state.candidateOrigins.get('p-2')).toEqual({ line: 1, column: 3 });
});
