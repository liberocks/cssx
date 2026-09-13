import { describe, expect, it } from 'vitest';

import { resolveIntrinsicSize } from './resolve-intrinsic-size';
import { parseTheme } from './theme';

describe('resolveIntrinsicSize', () => {
  const theme = parseTheme();

  it('resolves none, spacing values, and named theme values', () => {
    expect(resolveIntrinsicSize('none', 'contain-intrinsic-size', theme)).toBe('none');
    expect(resolveIntrinsicSize('2', 'contain-intrinsic-size', theme)).toBe('calc(0.25rem * 2)');
    expect(
      resolveIntrinsicSize('custom', 'contain-intrinsic-size', {
        ...theme,
        tokens: { ...theme.tokens, '--contain-intrinsic-size-custom': '24px' },
      }),
    ).toBe('24px');
  });

  it('resolves arbitrary values and returns null for missing names', () => {
    expect(resolveIntrinsicSize('[12px]', 'contain-intrinsic-size', theme)).toBe('12px');
    expect(resolveIntrinsicSize('missing', 'contain-intrinsic-size', theme)).toBeNull();
  });
});
