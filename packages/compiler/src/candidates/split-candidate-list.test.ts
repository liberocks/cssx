import { expect, it } from 'vitest';

import { splitCandidateList } from './split-candidate-list';

it('splits top-level whitespace while validating nested syntax', () => {
  expect(splitCandidateList('p-2 bg-[rgb(1 2 3)] content-["a b"]')).toEqual([
    'p-2',
    'bg-[rgb(1 2 3)]',
    'content-["a b"]',
  ]);
  expect(() => splitCandidateList('p-[1px')).toThrow('Invalid utility list');
});
