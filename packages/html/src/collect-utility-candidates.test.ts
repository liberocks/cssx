import { expect, it } from 'vitest';

import { collectUtilityCandidates } from './collect-utility-candidates';

it('collects valid class utilities and ignores ordinary, empty, and malformed classes', () => {
  const classes = ['p-4 hover:bg-red-500', 'app-card', '', 'p-[unterminated'];
  const document = {
    querySelectorAll: () => classes.map((className) => ({ getAttribute: () => className })),
  } as unknown as Document;

  expect(collectUtilityCandidates(document, '')).toEqual(new Set(['p-4', 'hover:bg-red-500']));
});
