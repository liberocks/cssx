import { expect, it } from 'vitest';

import { collectStyleMapCandidates } from './collect-style-map-candidates';

it('splits each style candidate list and preserves map and style names', () => {
  expect(
    collectStyleMapCandidates({
      button: { base: 'flex  p-4', icon: 'text-sm' },
      card: { base: 'p-4' },
    }),
  ).toEqual({
    byMap: {
      button: { base: ['flex', 'p-4'], icon: ['text-sm'] },
      card: { base: ['p-4'] },
    },
    all: ['flex', 'p-4', 'text-sm', 'p-4'],
  });
});

it('keeps empty maps and styles without candidates', () => {
  expect(collectStyleMapCandidates({ empty: {}, card: { blank: '' } })).toEqual({
    byMap: { empty: {}, card: { blank: [] } },
    all: [],
  });
});

it('enforces per-map entry and total candidate limits', () => {
  expect(() =>
    collectStyleMapCandidates({
      $: Object.fromEntries(Array.from({ length: 10_001 }, (_, index) => [`s${index}`, 'p-4'])),
    }),
  ).toThrow('at most 10000 entries');

  const repeatedCandidates = `${'p-4 '.repeat(4_095)}p-4`;
  expect(() =>
    collectStyleMapCandidates({
      $: Object.fromEntries(Array.from({ length: 13 }, (_, index) => [`s${index}`, repeatedCandidates])),
    }),
  ).toThrow('at most 50000 utility candidates');
});
