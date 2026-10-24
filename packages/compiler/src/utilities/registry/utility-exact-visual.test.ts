import { expect, it } from 'vitest';

import { EXACT_VISUAL_DECLARATIONS } from './utility-exact-visual';

it('keeps exact visual utility declarations available by candidate name', () => {
  expect(EXACT_VISUAL_DECLARATIONS['text-balance']).toEqual([{ property: 'text-wrap', value: 'balance' }]);
  expect(EXACT_VISUAL_DECLARATIONS['rounded-xl']).toEqual([{ property: 'border-radius', value: '0.75rem' }]);
  expect(EXACT_VISUAL_DECLARATIONS['shadow-sm']).toEqual([
    { property: '--cssx-shadow', value: '0 1px 2px 0 rgb(0 0 0 / .05)', semanticGroup: 'shadow' },
    {
      property: 'box-shadow',
      value:
        'var(--cssx-shadow, 0 0 #0000), var(--cssx-ring-offset-shadow, 0 0 #0000), var(--cssx-ring-shadow, 0 0 #0000)',
      semanticGroup: 'shadow',
    },
  ]);
  expect(EXACT_VISUAL_DECLARATIONS['not-an-exact-utility']).toBeUndefined();
});
