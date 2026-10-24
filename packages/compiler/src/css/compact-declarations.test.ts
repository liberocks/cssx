import { expect, it } from 'vitest';

import { compactDeclarations } from './compact-declarations';

it('expands compact utility declarations', () => {
  expect(compactDeclarations([['display', 'block=block;inline=inline']])).toEqual({
    block: [{ property: 'display', value: 'block' }],
    inline: [{ property: 'display', value: 'inline' }],
  });
});
