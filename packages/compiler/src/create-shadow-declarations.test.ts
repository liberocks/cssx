import { expect, it } from 'vitest';

import { createShadowDeclarations } from './create-shadow-declarations';

it('creates a shadow channel and a ring-compatible box-shadow sink', () => {
  expect(createShadowDeclarations('0 2px 4px #000')).toEqual([
    { property: '--cssx-shadow', value: '0 2px 4px #000', semanticGroup: 'shadow' },
    {
      property: 'box-shadow',
      value:
        'var(--cssx-shadow, 0 0 #0000), var(--cssx-ring-offset-shadow, 0 0 #0000), var(--cssx-ring-shadow, 0 0 #0000)',
      semanticGroup: 'shadow',
    },
  ]);
});
