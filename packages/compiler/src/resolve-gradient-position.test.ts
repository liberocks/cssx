import { describe, expect, it } from 'vitest';

import { resolveGradientPosition } from './resolve-gradient-position';

describe('resolveGradientPosition', () => {
  it('accepts bounded integer and decimal percentages with optional brackets', () => {
    expect(resolveGradientPosition('50%')).toBe('50%');
    expect(resolveGradientPosition('[42.5%]')).toBe('42.5%');
    expect(resolveGradientPosition('0%')).toBe('0%');
    expect(resolveGradientPosition('100%')).toBe('100%');
  });

  it('rejects out-of-range and malformed positions', () => {
    expect(resolveGradientPosition('100.1%')).toBeNull();
    expect(resolveGradientPosition('-1%')).toBeNull();
    expect(resolveGradientPosition('center')).toBeNull();
    expect(resolveGradientPosition('[20px]')).toBeNull();
  });
});
