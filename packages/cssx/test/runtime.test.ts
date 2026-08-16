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

  it('uses compiler tombstones to clear domains without emitting an empty class', () => {
    const numeric = ['x-numeric', '', 'numeric-tabular', 'numeric-tabular'] as const;
    const reset = [null, '', 'numeric-normal', 'numeric-normal', 'numeric-tabular'] as const;
    const resetClass = ['x-reset', '', 'numeric-normal', 'numeric-normal'] as const;

    expect(reduceCompiledUtilities([numeric, reset, resetClass])).toEqual([resetClass]);
    expect(
      props(
        { $$css: 2, c: 'x-numeric-composite', _: [numeric] },
        { $$css: 2, c: 'x-reset-composite', _: [reset, resetClass] },
      ),
    ).toEqual({
      className: 'x-reset',
    });
  });

  it('joins static, conditional, and nested class strings without parsing utilities', () => {
    expect(sx('x-base', false, ['x-nested', [null, 'x-last']])).toBe('x-base x-nested x-last');
  });
});
