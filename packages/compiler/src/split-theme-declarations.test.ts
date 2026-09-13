import { expect, it } from 'vitest';

import { splitThemeDeclarations } from './split-theme-declarations';

it('splits only top-level semicolons and drops empty declarations', () => {
  expect(splitThemeDeclarations(' --a: "one;two"; --b: fn(one;two); ; --c: 3 ')).toEqual([
    '--a: "one;two"',
    '--b: fn(one;two)',
    '--c: 3',
  ]);
});

it('rejects unmatched parentheses, quotes, and trailing escapes', () => {
  expect(() => splitThemeDeclarations('--x: fn(value')).toThrow('Invalid CSSX @theme declaration');
  expect(() => splitThemeDeclarations('--x: value)')).toThrow('Invalid CSSX @theme declaration');
  expect(() => splitThemeDeclarations('--x: "value')).toThrow('Invalid CSSX @theme declaration');
  expect(() => splitThemeDeclarations('--x: value\\')).toThrow('Invalid CSSX @theme declaration');
});
