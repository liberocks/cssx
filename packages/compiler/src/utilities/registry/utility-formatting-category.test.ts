import { expect, it } from 'vitest';

import { PREFIX_GROUPS } from './semantics-prefix-groups';
import { formattingCategory } from './utility-formatting-category';

it('assigns every registered utility family to a documented category', () => {
  const missing = [...new Set(PREFIX_GROUPS.map(([, group]) => group))].filter(
    (group) => formattingCategory(group) === null,
  );
  expect(missing).toEqual([]);
});
