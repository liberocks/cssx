import { expect, it } from 'vitest';

import { dataFromValue } from './data-from-value';

it('normalizes malformed and valid CSSX metadata values', () => {
  expect(dataFromValue(null)).toEqual({
    id: '',
    rules: [],
    candidates: {},
    composites: {},
    origins: {},
    cssOnlySignature: '',
  });
  expect(
    dataFromValue({
      id: 'entry.ts',
      rules: [{}],
      candidates: { p: [] },
      composites: { card: [] },
      atomicClasses: ['x0'],
      origins: { p: [] },
      cssOnlySignature: 'signature',
    }),
  ).toEqual({
    id: 'entry.ts',
    rules: [{}],
    candidates: { p: [] },
    composites: { card: [] },
    atomicClasses: ['x0'],
    origins: { p: [] },
    cssOnlySignature: 'signature',
  });
});
