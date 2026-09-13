import { expect, it } from 'vitest';

import { classifyUtility } from './classify-utility';

it('returns the conflict record for a supported static utility', () => {
  expect(classifyUtility('p-4')).toEqual({
    scope: '',
    group: 'p',
    conflicts: ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe'],
  });
});

it('returns null for an unsupported utility candidate', () => {
  expect(classifyUtility('not-a-utility')).toBeNull();
});
