import { expect, it } from 'vitest';

import { mergeStyles } from './merge-styles';

it('merges values in order and appends transform channels', () => {
  expect(
    mergeStyles([
      { padding: 8, transform: [{ translateX: 2 }] },
      { padding: 16, transform: [{ scale: 2 }], color: '#fff' },
    ]),
  ).toEqual({ padding: 16, transform: [{ translateX: 2 }, { scale: 2 }], color: '#fff' });
  expect(mergeStyles([])).toEqual({});
});
