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

it('factors repeated bundles through correlated singleton partitions', () => {
  const result = compileStyleRecords(
    Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => [
        `style${index}`,
        `[display:flex] [color:red] [font-weight:600] [background-color:${index < 3 ? 'red' : 'blue'}]`,
      ]),
    ),
  );

  expect(Object.keys(result.composites)).toHaveLength(2);
  expect(new Set(Object.values(result.classNames)).size).toBe(2);
  expect(Object.values(result.classNames).every((className) => className.split(' ').length === 1)).toBe(true);
});

it('leaves non-partitioning correlated groups independent', () => {
  const parent = '[display:flex] [color:red] [font-weight:600]';
  const source = (indexes: readonly number[]) =>
    Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => [
        `style${index}`,
        `${parent}${indexes.includes(index) ? ' [background-color:red]' : ''}`,
      ]),
    );

  expect(() =>
    compileStyleRecords({
      first: `${parent} [background-color:red] [border-color:red]`,
      second: `${parent} [background-color:red]`,
      third: `${parent} [background-color:red] [border-color:blue]`,
      fourth: `${parent} [border-color:blue]`,
      fifth: '[background-color:red] [border-color:blue]',
      sixth: parent,
    }),
  ).not.toThrow();
  expect(() => compileStyleRecords(source([0, 1, 2]))).not.toThrow();
  expect(() =>
    compileStyleRecords(
      Object.fromEntries(
        Array.from({ length: 6 }, (_, index) => [
          `style${index}`,
          `${parent}${index < 3 ? ' [background-color:red]' : ''}${[0, 3, 4, 5].includes(index) ? ' [border-color:red]' : ''}`,
        ]),
      ),
    ),
  ).not.toThrow();
  expect(() =>
    compileStyleRecords(
      Object.fromEntries(
        Array.from({ length: 6 }, (_, index) => [
          `style${index}`,
          `${parent}${index < 3 ? ' [background-color:red]' : ''}${[3, 4].includes(index) ? ' [border-color:red]' : ''}`,
        ]),
      ),
    ),
  ).not.toThrow();
});

it('rejects reusability budgets outside the supported range', () => {
  expect(() => compileStyleRecords({ root: 'p-4' }, { reusabilityBudget: -1 })).toThrow('reusabilityBudget');
  expect(() => compileStyleRecords({ root: 'p-4' }, { reusabilityBudget: 101 })).toThrow('reusabilityBudget');
});

it('keeps an empty named style as an empty class string', () => {
  expect(compileStyleRecords({ empty: '' }).classNames.empty).toBe('');
});
