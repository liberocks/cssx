import { describe, expect, it } from 'vitest';
import { create, props, reduceCompiledUtilities, sx } from '../src/index';

describe('CSSX runtime', () => {
  it('fails when create reaches runtime', () => {
    expect(() => create({ root: 'p-5' })).toThrow('must be compiled');
  });

  it('merges compiled utility records by directional class groups and scope', () => {
    const p = ['xp', '', 'p', 'p', 'px', 'pr'] as const;
    const px = ['xpx', '', 'px', 'px', 'pr'] as const;
    const pr = ['xpr', '', 'pr', 'pr'] as const;
    const hover = ['xh', 'hover', 'p', 'p', 'px', 'pr'] as const;

    expect(reduceCompiledUtilities([pr, px])).toEqual([px]);
    expect(reduceCompiledUtilities([p, px, pr])).toEqual([p, px, pr]);
    expect(reduceCompiledUtilities([p, hover])).toEqual([p, hover]);
    expect(props({ $$css: 2, c: 'x-first', _: [p] }, { $$css: 2, c: 'x-second', _: [px, pr] })).toEqual({
      className: 'xp xpx xpr',
    });
    expect(props('external', [{ $$css: 2, c: 'x-composite', _: [p] }, false], 'other')).toEqual({
      className: 'external x-composite other',
    });
  });

  it('uses one composite class for a single compiled style', () => {
    const record = ['x-atomic', '', 'display', 'display'] as const;

    expect(props({ $$css: 2, c: 'x-composite', _: [record] })).toEqual({ className: 'x-composite' });
    expect(() => props({ $$css: 1, _: [record] } as never)).toThrow('not compiled by CSSX');
  });
