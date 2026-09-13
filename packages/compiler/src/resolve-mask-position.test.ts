import { describe, expect, it } from 'vitest';

import { resolveMaskPosition } from './resolve-mask-position';
import { parseTheme } from './theme';

describe('resolveMaskPosition', () => {
  const theme = parseTheme();

  it('resolves percentage, arbitrary length, and spacing positions', () => {
    expect(resolveMaskPosition('42.5%', theme)).toBe('42.5%');
    expect(resolveMaskPosition('[length:12px]', theme)).toBe('12px');
    expect(resolveMaskPosition('4', theme)).toBe('calc(0.25rem * 4)');
  });

  it('rejects non-length arbitrary values and unknown spacing tokens', () => {
    expect(resolveMaskPosition('[color:red]', theme)).toBeNull();
    expect(resolveMaskPosition('unknown', theme)).toBeNull();
  });
});
