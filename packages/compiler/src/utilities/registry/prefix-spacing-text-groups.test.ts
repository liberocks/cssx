import { expect, it } from 'vitest';

import { PREFIX_SPACING_TEXT_GROUPS } from './prefix-spacing-text-groups';

it('keeps ordered spacing and text prefix groups together', () => {
  expect(PREFIX_SPACING_TEXT_GROUPS).toHaveLength(69);
  expect(PREFIX_SPACING_TEXT_GROUPS[0]).toEqual(['placeholder-', 'placeholder-color']);
  expect(PREFIX_SPACING_TEXT_GROUPS).toContainEqual(['scroll-pbs-', 'scroll-padding-block-start']);
  expect(PREFIX_SPACING_TEXT_GROUPS.at(-1)).toEqual(['hyphens-', 'hyphens']);
});
