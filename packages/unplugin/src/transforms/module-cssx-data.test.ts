import { expect, it } from 'vitest';

import { emptyModuleCssxData, hasCssxStyleData, RULES_METADATA_KEY } from './module-cssx-data';

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

it('recognizes CSS rules, candidate selectors, and composite selectors independently', () => {
  expect(hasCssxStyleData({ rules: [], candidates: {}, composites: {} })).toBe(false);
  expect(hasCssxStyleData({ rules: [{ className: 'rule', css: '.rule{}' }], candidates: {}, composites: {} })).toBe(
    true,
  );
  expect(hasCssxStyleData({ rules: [], candidates: { 'p-4': 'dpadding' }, composites: {} })).toBe(true);
  expect(hasCssxStyleData({ rules: [], candidates: {}, composites: { dbutton: ['dpadding'] } })).toBe(true);
  expect(hasCssxStyleData({ rules: [], candidates: {}, composites: undefined })).toBe(false);
});
