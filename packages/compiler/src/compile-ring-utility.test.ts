import { describe, expect, it } from 'vitest';

import { compileRingUtility } from './compile-ring-utility';
import { parseTheme } from './theme';

describe('compileRingUtility', () => {
  const theme = parseTheme();

  it('compiles ring widths and offset widths through the shared shadow sink', () => {
    expect(compileRingUtility('ring', theme)).toHaveLength(3);
    expect(compileRingUtility('ring-4', theme)?.[0]).toMatchObject({
      property: '--cssx-ring-width',
      value: '4px',
    });
    expect(compileRingUtility('ring-offset-2', theme)).toHaveLength(3);
  });

  it('compiles ring colors and offset colors with opacity', () => {
    expect(compileRingUtility('ring-red-500/50', theme)?.[0]?.value).toContain('color-mix');
    expect(compileRingUtility('ring-offset-white', theme)?.[0]).toMatchObject({ property: '--cssx-ring-offset-color' });
  });

  it('rejects invalid colors, opacity, and utility names', () => {
    expect(compileRingUtility('ring-offset-invalid', theme)).toBeNull();
    expect(compileRingUtility('ring-red-500/101', theme)).toBeNull();
    expect(compileRingUtility('ring-not-a-color', theme)).toBeNull();
    expect(compileRingUtility('not-ring-utility', theme)).toBeNull();
  });
});
