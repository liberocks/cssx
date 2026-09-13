import { expect, it } from 'vitest';

import { compileSourceUtilities } from './compile-source-utilities';
import { compileUtilities } from './compile-utilities';

it('compiles candidates into classes, entries, and CSS', async () => {
  const result = await compileUtilities(['p-1', 'hidden'], (candidate) => `c${candidate}`);
  expect(result.classes['p-1']).toBe('cp-1');
  expect(result.classes.hidden).toBe('chidden');
  expect(result.css).toContain('.cp-1{padding:calc(0.25rem * 1);}');
  expect(result.css).toContain('.chidden{display:none;}');
  expect(result.entries).toHaveLength(2);
});

it('honors composite alias and included-class filters through the list compiler', async () => {
  const result = await compileUtilities(['p-1', 'hidden'], (candidate) => `c${candidate}`, '', { 'cp-1': ['alias'] }, new Set(['alias']));
  expect(result.css).toContain('.alias{padding:calc(0.25rem * 1);}');
  expect(result.css).not.toContain('display: none');
});

it('rejects unsupported utilities', async () => {
  await expect(compileUtilities(['not-understood'], (candidate) => candidate)).rejects.toThrow('cannot compile utility');
});

it('compiles source utilities using the utility strings as selectors', async () => {
  const result = await compileSourceUtilities(['p-1', 'hidden']);
  expect(result.classes['p-1']).toBe('p-1');
  expect(result.css).toContain('.p-1{padding:calc(0.25rem * 1);}');
  expect(result.css).toContain('.hidden{display:none;}');
});