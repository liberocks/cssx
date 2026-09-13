import { describe, expect, it } from 'vitest';

import { compileScaleUtility } from './compile-scale-utility';

describe('compileScaleUtility', () => {
  it('compiles all scale channels with their merge sinks', () => {
    const sink = 'var(--cssx-scale-x, 1) var(--cssx-scale-y, 1) var(--cssx-scale-z, 1)';

    for (const axis of ['x', 'y', 'z']) {
      expect(compileScaleUtility(`scale-${axis}-50`, false)).toEqual([
        { property: `--cssx-scale-${axis}`, value: '0.5' },
        { property: 'scale', value: sink },
      ]);
    }
    expect(compileScaleUtility('scale-50', false)).toEqual([
      { property: '--cssx-scale-x', value: '0.5' },
      { property: '--cssx-scale-y', value: '0.5' },
      { property: 'scale', value: sink },
    ]);
  });

  it('supports negative scales and rejects invalid or unrelated candidates', () => {
    expect(compileScaleUtility('scale-x-50', true)?.[0]).toEqual({ property: '--cssx-scale-x', value: '-0.5' });
    expect(compileScaleUtility('scale-invalid', false)).toBeNull();
    expect(compileScaleUtility('rotate-45', false)).toBeNull();
  });
});
