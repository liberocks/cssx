import { expect, it } from 'vitest';

import { BORDER_WIDTH_PROPERTIES } from './border-width-properties';

it('maps supported border axes to every affected side', () => {
  expect(BORDER_WIDTH_PROPERTIES).toEqual({
    x: ['border-left-width', 'border-right-width'],
    y: ['border-top-width', 'border-bottom-width'],
    t: ['border-top-width'],
    r: ['border-right-width'],
    b: ['border-bottom-width'],
    l: ['border-left-width'],
    s: ['border-inline-start-width'],
    e: ['border-inline-end-width'],
    bs: ['border-block-start-width'],
    be: ['border-block-end-width'],
  });
});
