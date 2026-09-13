import { expect, it } from 'vitest';

import { create } from './create';
import { sx } from './sx';

it('compiles utility strings and merges compiled conditional styles', () => {
  const record = create({ value: 'm-2' }).value;

  expect(sx('p-2', false, [record], 'p-4')).toEqual({ margin: 8, padding: 16 });
  expect(sx()).toEqual({});
});
