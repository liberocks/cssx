import { expect, it } from 'vitest';

import { EXACT_SHADOW_DECLARATIONS } from './utility-exact-shadow';

it('resolves fixed shadow scales into complete declarations', () => {
  expect(Object.keys(EXACT_SHADOW_DECLARATIONS)).toHaveLength(7);
  expect(EXACT_SHADOW_DECLARATIONS['shadow-none']).toEqual([
    { property: '--cssx-shadow', value: '0 0 #0000', semanticGroup: 'shadow' },
    {
      property: 'box-shadow',
      value:
        'var(--cssx-shadow, 0 0 #0000), var(--cssx-ring-offset-shadow, 0 0 #0000), var(--cssx-ring-shadow, 0 0 #0000)',
      semanticGroup: 'shadow',
    },
  ]);
  expect(EXACT_SHADOW_DECLARATIONS.shadow).toEqual(
    expect.arrayContaining([expect.objectContaining({ property: 'box-shadow', semanticGroup: 'shadow' })]),
  );
});
