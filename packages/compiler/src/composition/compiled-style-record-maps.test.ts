import { expect, it } from 'vitest';

import { compileStyleRecordMaps } from './compiled-style-record-maps';

it('compiles several maps with shared class names', () => {
  const result = compileStyleRecordMaps({
    button: { base: 'p-4 bg-red-500' },
    card: { base: 'p-4' },
  });

  const button = result.styleMaps.button!;
  const card = result.styleMaps.card!;

  expect(button.classes['p-4']).toBe(result.classes['p-4']);
  expect(card.classes['p-4']).toBe(result.classes['p-4']);
  expect(button.classes['bg-red-500']).toBeDefined();
  expect(result.composites[button.classNames.base!]).toContain(result.classes['p-4']);
});

it('keeps empty style maps intact', () => {
  const result = compileStyleRecordMaps({});

  expect(result.styleMaps).toEqual({});
  expect(result.classes).toEqual({});
  expect(result.composites).toEqual({});
});

it('enforces the map entry limit', () => {
  expect(() =>
    compileStyleRecordMaps({
      $: Object.fromEntries(Array.from({ length: 10_001 }, (_, index) => [`s${index}`, 'p-4'])),
    }),
  ).toThrow('at most 10000 entries');
});

it('enforces the candidate count limit', () => {
  const source = `${'p-4 '.repeat(4_095)}p-4`;

  expect(() =>
    compileStyleRecordMaps({
      $: Object.fromEntries(Array.from({ length: 13 }, (_, index) => [`s${index}`, source])),
    }),
  ).toThrow('at most 50000 utility candidates');
});
