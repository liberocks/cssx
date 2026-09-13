import { expect, it } from 'vitest';

import { compileStyleRecords } from './compile-style-records';

it('compiles one static style map into runtime records', () => {
  const result = compileStyleRecords({ root: 'p-4 bg-red-500' });

  expect(result.classes['p-4']).toBeDefined();
  expect(result.classes['bg-red-500']).toBeDefined();
  expect(result.styles.root).toBeDefined();
  expect(result.styles.root?._.length).toBeGreaterThan(0);
});

it('returns an empty record map for an empty input', () => {
  const result = compileStyleRecords({});

  expect(result.styles).toEqual({});
  expect(result.classes).toEqual({});
  expect(result.candidates).toEqual({});
  expect(result.classNames).toEqual({});
  expect(result.composites).toEqual({});
});

it('supports shared allocators and reusability budgets', () => {
  const records = compileStyleRecords(
    {
      first: 'flex items-center justify-center',
      second: 'flex items-center justify-center',
    },
    { reusabilityBudget: 100 },
  );

  expect(records.classNames.first?.split(' ')).toHaveLength(3);
  expect(records.classNames.second).toBe(records.classNames.first);
});
