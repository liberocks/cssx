import { expect, it } from 'vitest';

import { EXACT_FLEX_DECLARATIONS } from './utility-exact-flex';

it('resolves every exact flexbox declaration', () => {
  expect(Object.keys(EXACT_FLEX_DECLARATIONS)).toHaveLength(14);
  expect(EXACT_FLEX_DECLARATIONS['flex-col']).toEqual([{ property: 'flex-direction', value: 'column' }]);
  expect(EXACT_FLEX_DECLARATIONS['flex-initial']).toEqual([{ property: 'flex', value: '0 1 auto' }]);
  expect(EXACT_FLEX_DECLARATIONS['grow-0']).toEqual([{ property: 'flex-grow', value: '0' }]);
  expect(EXACT_FLEX_DECLARATIONS['shrink-0']).toEqual([{ property: 'flex-shrink', value: '0' }]);
});
