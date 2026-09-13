import { describe, expect, it } from 'vitest';

import { resolveUtilityColor } from './resolve-utility-color';
import { parseTheme } from './theme';

describe('resolveUtilityColor', () => {
  const theme = parseTheme();

  it('resolves CSS keywords, theme colors, and unknown colors', () => {
    expect(resolveUtilityColor('current', theme)).toBe('currentColor');
    expect(resolveUtilityColor('inherit', theme)).toBe('inherit');
    expect(resolveUtilityColor('red-500', theme)).toContain('oklch');
    expect(resolveUtilityColor('not-a-color', theme)).toBeNull();
  });
});
