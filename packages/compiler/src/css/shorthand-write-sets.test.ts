import { expect, it } from 'vitest';

import { SHORTHAND_WRITE_SETS } from './shorthand-write-sets';

it('tracks longhands reset by common CSS shorthands', () => {
  expect(SHORTHAND_WRITE_SETS.font).toContain('font-family');
  expect(SHORTHAND_WRITE_SETS.font).toContain('line-height');
  expect(SHORTHAND_WRITE_SETS.background).toContain('background-image');
  expect(SHORTHAND_WRITE_SETS.border).toContain('border-top-width');
  expect(SHORTHAND_WRITE_SETS.grid).toContain('grid-auto-flow');
  expect(SHORTHAND_WRITE_SETS.mask).toContain('mask-composite');
  expect(SHORTHAND_WRITE_SETS.transition).toContain('transition-behavior');
});

it('keeps specialized shorthand reset sets minimal and explicit', () => {
  expect(SHORTHAND_WRITE_SETS['animation-range']).toEqual(['animation-range-start', 'animation-range-end']);
  expect(SHORTHAND_WRITE_SETS.container).toEqual(['container-name', 'container-type']);
});
