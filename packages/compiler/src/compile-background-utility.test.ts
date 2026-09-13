import { describe, expect, it } from 'vitest';

import { compileBackgroundUtility } from './compile-background-utility';

describe('compileBackgroundUtility', () => {
  it('compiles fixed background image, size, position, repeat, and clip utilities', () => {
    expect(compileBackgroundUtility('bg-cover')).toEqual({ property: 'background-size', value: 'cover' });
    expect(compileBackgroundUtility('bg-top-right')).toEqual({ property: 'background-position', value: 'top right' });
    expect(compileBackgroundUtility('bg-repeat-round')).toEqual({ property: 'background-repeat', value: 'round' });
    expect(compileBackgroundUtility('bg-clip-text')).toHaveLength(3);
    expect(compileBackgroundUtility('bg-none')).toEqual({ property: 'background-image', value: 'none' });
  });

  it('resolves arbitrary positions and sizes and rejects unrelated utilities', () => {
    expect(compileBackgroundUtility('bg-position-[25%_75%]')).toEqual({
      property: 'background-position',
      value: '25% 75%',
    });
    expect(compileBackgroundUtility('bg-size-(--hero-size)')).toEqual({
      property: 'background-size',
      value: 'var(--hero-size)',
    });
    expect(compileBackgroundUtility('bg-position-invalid')).toBeNull();
    expect(compileBackgroundUtility('not-background')).toBeNull();
  });
});
