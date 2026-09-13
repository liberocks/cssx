import { describe, expect, it } from 'vitest';
import { reduceCompiledUtilities } from './reduce-compiled-utilities';
import type { CompiledUtility } from './types';

describe('reduceCompiledUtilities', () => {
  it('keeps directional and scoped groups independent', () => {
    const p = ['xp', '', 'p', 'p', 'px', 'pr'] as const;
    const px = ['xpx', '', 'px', 'px', 'pr'] as const;
    const pr = ['xpr', '', 'pr', 'pr'] as const;
    const hover = ['xh', 'hover', 'p', 'p', 'px', 'pr'] as const;
    expect(reduceCompiledUtilities([pr, px])).toEqual([px]);
    expect(reduceCompiledUtilities([p, px, pr])).toEqual([p, px, pr]);
    expect(reduceCompiledUtilities([p, hover])).toEqual([p, hover]);
  });

  it('honors tombstones and sparse records', () => {
    const numeric = ['x-numeric', '', 'numeric-tabular', 'numeric-tabular'] as const;
    const reset = [null, '', 'numeric-normal', 'numeric-normal', 'numeric-tabular'] as const;
    const resetClass = ['x-reset', '', 'numeric-normal', 'numeric-normal'] as const;
    expect(reduceCompiledUtilities([numeric, reset, resetClass])).toEqual([resetClass]);
    const record = ['x-atomic', '', '', ''] as const;
    expect(reduceCompiledUtilities([undefined, record] as unknown as readonly CompiledUtility[])).toEqual([record]);
  });
});
