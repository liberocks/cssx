import { expect, it } from 'vitest';

import { emptyModuleCssxData, RULES_METADATA_KEY } from './module-cssx-data';

it('provides the stable metadata key used by bundler adapters', () => {
  expect(RULES_METADATA_KEY).toBe('@cssxio/unplugin/rules');
});

it('creates an empty module record with every metadata collection initialized', () => {
  expect(emptyModuleCssxData()).toEqual({
    id: '',
    rules: [],
    candidates: {},
    composites: {},
    origins: {},
    cssOnlySignature: '',
  });
});
