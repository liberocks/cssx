import { expect, it } from 'vitest';

import { utilityFallback } from './fallback';

it('returns the checked-in fallback for a candidate that needs one', () => {
  expect(utilityFallback('align-baseline')).toEqual({
    css: '.align-baseline{vertical-align: baseline;}',
    group: 'fallback-vertical-align',
  });
});

it('uses CSSX-owned variables for precompiled gradient fallback records', () => {
  expect(utilityFallback('-bg-conic-0')).toEqual({
    css: '.-bg-conic-0{--cx-gradient-position: from calc(0deg * -1) in oklab;\n    background-image: conic-gradient(var(--cx-gradient-stops));}',
    group: 'fallback---cx-gradient-position',
  });
});

it('returns undefined for candidates without a fallback record', () => {
  expect(utilityFallback('not-a-utility')).toBeUndefined();
});
