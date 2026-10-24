import { expect, it } from 'vitest';

import { EXACT_BORDER_DECLARATIONS } from './utility-exact-border';

it('resolves fixed radius and directional border declarations', () => {
  expect(Object.keys(EXACT_BORDER_DECLARATIONS)).toHaveLength(19);
  expect(EXACT_BORDER_DECLARATIONS['rounded-full']).toEqual([{ property: 'border-radius', value: '9999px' }]);
  expect(EXACT_BORDER_DECLARATIONS['border-x']).toEqual([
    { property: 'border-left-width', value: '1px' },
    { property: 'border-right-width', value: '1px' },
  ]);
  expect(EXACT_BORDER_DECLARATIONS['border-b']).toEqual([{ property: 'border-bottom-width', value: '1px' }]);
});
