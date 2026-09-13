import { describe, expect, it } from 'vitest';

import { compileSkewUtility } from './compile-skew-utility';

describe('compileSkewUtility', () => {
  it('compiles axis-specific and shared skew channels', () => {
    const sink = 'skewX(var(--cssx-skew-x, 0deg)) skewY(var(--cssx-skew-y, 0deg))';

    expect(compileSkewUtility('skew-x-6', false)).toEqual([
      { property: '--cssx-skew-x', value: '6deg' },
      { property: 'transform', value: sink },
    ]);
    expect(compileSkewUtility('skew-y-[0.25turn]', false)?.[0]).toEqual({
      property: '--cssx-skew-y',
      value: '0.25turn',
    });
    expect(compileSkewUtility('skew-6', false)).toEqual([
      { property: '--cssx-skew-x', value: '6deg' },
      { property: '--cssx-skew-y', value: '6deg' },
      { property: 'transform', value: sink },
    ]);
  });

  it('negates valid angles and rejects invalid or unrelated candidates', () => {
    expect(compileSkewUtility('skew-y-6', true)?.[0]).toEqual({ property: '--cssx-skew-y', value: '-6deg' });
    expect(compileSkewUtility('skew-x-invalid', false)).toBeNull();
    expect(compileSkewUtility('skew-invalid', false)).toBeNull();
    expect(compileSkewUtility('rotate-45', false)).toBeNull();
  });
});
