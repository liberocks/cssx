import { expect, it } from 'vitest';

import { RULES_METADATA_KEY } from '../transforms/module-cssx-data';
import { dataFromMetadata } from './data-from-metadata';

it('reads CSSX data from the designated metadata key', () => {
  expect(dataFromMetadata(undefined).id).toBe('');
  expect(dataFromMetadata({ [RULES_METADATA_KEY]: { id: 'card.ts', rules: [] } })).toMatchObject({ id: 'card.ts' });
});
