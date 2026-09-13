import { expect, it } from 'vitest';

import { PSEUDO_CLASS_VARIANTS, PSEUDO_ELEMENT_VARIANTS } from './pseudo-variant-selectors';

it('defines pseudo-class selector fragments for state and position variants', () => {
  expect(PSEUDO_CLASS_VARIANTS.hover).toBe('hover');
  expect(PSEUDO_CLASS_VARIANTS['focus-visible']).toBe('focus-visible');
  expect(PSEUDO_CLASS_VARIANTS.first).toBe('first-child');
  expect(PSEUDO_CLASS_VARIANTS.odd).toBe('nth-child(odd)');
});

it('defines pseudo-element selector fragments, including the file button alias', () => {
  expect(PSEUDO_ELEMENT_VARIANTS.before).toBe('before');
  expect(PSEUDO_ELEMENT_VARIANTS.placeholder).toBe('placeholder');
  expect(PSEUDO_ELEMENT_VARIANTS.file).toBe('file-selector-button');
});
