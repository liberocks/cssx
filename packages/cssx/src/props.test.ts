import { describe, expect, it } from 'vitest';

import { props } from './props';

describe('props', () => {
  it('resolves utility conflicts while retaining raw classes', () => {
    const p = ['xp', '', 'p', 'p', 'px', 'pr'] as const;
    const px = ['xpx', '', 'px', 'px', 'pr'] as const;
    const pr = ['xpr', '', 'pr', 'pr'] as const;
    expect(props({ $$css: 2, c: 'x-first', _: [p] }, { $$css: 2, c: 'x-second', _: [px, pr] })).toEqual({
      className: 'xp xpx xpr',
    });
    expect(props('external', [{ $$css: 2, c: 'x-composite', _: [p] }, false], 'other')).toEqual({
      className: 'external x-composite other',
    });
  });

  it('uses a composite class for one style and validates style markers', () => {
    const record = ['x-atomic', '', 'display', 'display'] as const;
    expect(props({ $$css: 2, c: 'x-composite', _: [record] })).toEqual({ className: 'x-composite' });
    expect(props()).toEqual({ className: '' });
    expect(props('external', ['nested', false])).toEqual({ className: 'external nested' });
    expect(props({ $$css: 2, c: '', _: [record] })).toEqual({ className: '' });
    expect(() => props({ $$css: 1, _: [record] } as never)).toThrow('not compiled by CSSX');
  });

  it('deduplicates atomic class winners and rejects malformed styles', () => {
    const first = ['x-shared', '', 'first', 'first'] as const;
    const second = ['x-shared', '', 'second', 'second'] as const;
    expect(props({ $$css: 2, c: 'x-first', _: [first] }, { $$css: 2, c: 'x-second', _: [second] })).toEqual({
      className: 'x-shared',
    });
    expect(() => props(1 as never)).toThrow('not compiled by CSSX');
    expect(() => props({ $$css: 2, c: 1, _: [] } as never)).toThrow('not compiled by CSSX');
    expect(() => props({ $$css: 2, c: 'x', _: 'invalid' } as never)).toThrow('not compiled by CSSX');
  });
});
