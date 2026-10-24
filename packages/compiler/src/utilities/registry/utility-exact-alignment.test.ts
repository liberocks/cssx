import { expect, it } from 'vitest';

import { EXACT_ALIGNMENT_DECLARATIONS } from './utility-exact-alignment';

it('resolves exact alignment declarations across items, content, and self', () => {
  expect(Object.keys(EXACT_ALIGNMENT_DECLARATIONS)).toHaveLength(43);
  expect(EXACT_ALIGNMENT_DECLARATIONS['items-start']).toEqual([{ property: 'align-items', value: 'flex-start' }]);
  expect(EXACT_ALIGNMENT_DECLARATIONS['justify-between']).toEqual([
    { property: 'justify-content', value: 'space-between' },
  ]);
  expect(EXACT_ALIGNMENT_DECLARATIONS['place-content-evenly']).toEqual([
    { property: 'place-content', value: 'space-evenly' },
  ]);
});
