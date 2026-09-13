import { describe, expect, it } from 'vitest';

import { resolveMaskColor } from './resolve-mask-color';
import { parseTheme } from './theme';

describe('resolveMaskColor', () => {
  const theme = parseTheme();

  it('resolves theme colors with optional slash opacity', () => {
    expect(resolveMaskColor('red-500', theme)).toContain('oklch');
    expect(resolveMaskColor('red-500/50', theme)).toContain('color-mix');
  });

  it('rejects unknown colors and invalid opacity values', () => {
    expect(resolveMaskColor('missing-color', theme)).toBeNull();
    expect(resolveMaskColor('red-500/101', theme)).toBeNull();
  });
});
