import { expect, it } from 'vitest';

import { classSelectors } from './class-selectors';

it('returns the escaped atomic selector when no aliases exist', () => {
  expect(classSelectors('p-1', {}, undefined)).toEqual(['.p-1']);
  expect(classSelectors('a:b', {}, undefined)).toEqual(['.a\\:b']);
});

it('drops the atomic selector when it is not included', () => {
  expect(classSelectors('p-1', {}, new Set(['other']))).toEqual([]);
});

it('merges sorted composite aliases with the atomic class', () => {
  expect(classSelectors('x', { x: ['b', 'a'] }, undefined)).toEqual(['.a', '.b', '.x']);
  expect(classSelectors('x', { x: ['b', 'a'] }, new Set(['x']))).toEqual(['.a', '.b', '.x']);
});

it('keeps composite aliases alive when the atomic class is excluded', () => {
  expect(classSelectors('x', { x: ['a', 'c'] }, new Set(['other']))).toEqual(['.a', '.c']);
});