import { expect, it } from 'vitest';

import { remapVueBlockOrigins } from './remap-vue-block-origins';

it('maps child candidate locations back into their enclosing Vue source block', () => {
  expect(
    remapVueBlockOrigins('<script>\nvalue\n</script>', 9, {
      p: { line: 0, column: 2 },
    }),
  ).toEqual({ p: { line: 1, column: 2 } });
  expect(remapVueBlockOrigins('<script/>', 0, {})).toEqual({});
});
