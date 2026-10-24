import { expect, it } from 'vitest';

import { EXACT_INTERACTION_DECLARATIONS } from './utility-exact-interaction';

it('resolves fixed interaction and control declarations', () => {
  expect(Object.keys(EXACT_INTERACTION_DECLARATIONS)).toHaveLength(17);
  expect(EXACT_INTERACTION_DECLARATIONS.underline).toEqual([{ property: 'text-decoration-line', value: 'underline' }]);
  expect(EXACT_INTERACTION_DECLARATIONS['pointer-events-none']).toEqual([
    { property: 'pointer-events', value: 'none' },
  ]);
  expect(EXACT_INTERACTION_DECLARATIONS['resize-x']).toEqual([{ property: 'resize', value: 'horizontal' }]);
});
