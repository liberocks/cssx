import { expect, it } from 'vitest';

import { advanceCssLocation } from './advance-css-location';

it('advances columns on one line and resets them after newlines', () => {
  expect(advanceCssLocation({ line: 2, column: 3 }, 'rule{}')).toEqual({ line: 2, column: 9 });
  expect(advanceCssLocation({ line: 2, column: 3 }, 'rule{\n color:red;\n}')).toEqual({ line: 4, column: 1 });
});
