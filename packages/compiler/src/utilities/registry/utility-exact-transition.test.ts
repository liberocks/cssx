import { expect, it } from 'vitest';

import { EXACT_TRANSITION_DECLARATIONS } from './utility-exact-transition';

it('resolves fixed transition behavior, properties, and timing functions', () => {
  expect(Object.keys(EXACT_TRANSITION_DECLARATIONS)).toHaveLength(13);
  expect(EXACT_TRANSITION_DECLARATIONS.transition).toHaveLength(3);
  expect(EXACT_TRANSITION_DECLARATIONS['transition-none']).toEqual([
    { property: 'transition-property', value: 'none' },
  ]);
  expect(EXACT_TRANSITION_DECLARATIONS['ease-out']).toEqual([
    { property: 'transition-timing-function', value: 'cubic-bezier(0, 0, .2, 1)' },
  ]);
});
