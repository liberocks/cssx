import { expect, it } from 'vitest';
import { dataFromMetadata } from './data-from-metadata';
import { RULES_METADATA_KEY } from './module-cssx-data';

it('reads CSSX data from the designated metadata key', () => {
  expect(dataFromMetadata(undefined).id).toBe('');
  expect(dataFromMetadata({ [RULES_METADATA_KEY]: { id: 'card.ts', rules: [] } })).toMatchObject({ id: 'card.ts' });
});
