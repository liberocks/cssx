import { expect, it } from 'vitest';

import { STRUCTURAL_UTILITY_GROUPS, STRUCTURAL_UTILITY_NAMES } from './structural-utilities';

it('maps relationship markers to structural groups and back', () => {
  expect(STRUCTURAL_UTILITY_GROUPS).toEqual({ group: 'structural-group', peer: 'structural-peer' });
  expect(STRUCTURAL_UTILITY_NAMES).toEqual({ 'structural-group': 'group', 'structural-peer': 'peer' });
});
