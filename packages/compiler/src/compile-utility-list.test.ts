import { expect, it } from 'vitest';

import { compileUtilityList } from './compile-utility-list';

it('rejects more than 50,000 candidates', async () => {
  await expect(
    compileUtilityList(new Array(50_001).fill('p-1'), (candidate) => `c${candidate}`, '', {}, undefined, {}, false),
  ).rejects.toThrow('CSSX supports at most 50,000 utility candidates per compilation.');
});

it('skips data-backed utilities without CSS and records an empty class', async () => {
  const result = await compileUtilityList(['border/50', 'p-1'], (candidate) => `x${candidate}`, '', {}, undefined, {}, false);
  expect(result.classes['border/50']).toBe('');
  expect(result.entries).toHaveLength(1);
});

it('uses source class names as selectors when escaping is requested', async () => {
  const result = await compileUtilityList(['p-1', 'hidden'], (candidate) => candidate, '', {}, undefined, {}, true);
  expect(result.classes['p-1']).toBe('p-1');
  expect(result.css).toContain('.p-1{padding:calc(0.25rem * 1);}');
  expect(result.css).toContain('.hidden{display:none;}');
});

it('splits generated class strings into per-atom classes', async () => {
  const result = await compileUtilityList(['border-x-2'], () => 'a b', '', {}, undefined, {}, false);
  expect(result.classes['border-x-2']).toBe('a b');
  expect(result.css).toContain('.a{border-left-width:2px;}');
  expect(result.css).toContain('.b{border-right-width:2px;}');
});

it('skips candidates whose generated classes are not included', async () => {
  const result = await compileUtilityList(['p-1', 'hidden'], (candidate) => `g${candidate}`, '', {}, new Set(['gp-1']), {}, false);
  expect(result.classes['hidden']).toBe('ghidden');
  expect(result.css).toContain('.gp-1{padding:calc(0.25rem * 1);}');
  expect(result.css).not.toContain('display: none');
});

it('keeps candidates alive through their composite aliases', async () => {
  const result = await compileUtilityList(['p-1'], () => 'x', '', { x: ['y'] }, new Set(['y']), {}, false);
  expect(result.css).toContain('.y{padding:calc(0.25rem * 1);}');
});

it('aggregates keyframe and property registrations into the prefix CSS', async () => {
  const result = await compileUtilityList(
    ['animate-pulse', 'scrollbar-thumb-red-500'],
    (candidate) => `g${candidate}`,
    '',
    {},
    undefined,
    {},
    false,
  );
  expect(result.prefixCss).toContain('@keyframes pulse');
  expect(result.prefixCss).toContain('@property --cssx-scrollbar-thumb');
});

it('deduplicates repeated candidates and identical emitted CSS', async () => {
  const result = await compileUtilityList(['p-1', 'p-1'], (candidate) => `x${candidate}`, '', {}, undefined, {}, false);
  expect(result.classes['p-1']).toBe('xp-1');
  expect(result.entries).toHaveLength(1);
  expect(result.entries[0]?.css).toBe('.xp-1{padding:calc(0.25rem * 1);}');
});