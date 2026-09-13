import { expect, it } from 'vitest';

import { utilityFallback } from './fallback';

it('returns the checked-in fallback for a candidate that needs one', () => {
  expect(utilityFallback('align-baseline')).toEqual({
    css: '.align-baseline{vertical-align: baseline;}',
    group: 'fallback-vertical-align',
  });
});

it('returns undefined for candidates without a fallback record', () => {
  expect(utilityFallback('not-a-utility')).toBeUndefined();
});
