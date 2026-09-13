import { describe, expect, it } from 'vitest';

import { compileGradientUtility } from './compile-gradient-utility';
import { parseTheme } from './theme';

describe('compileGradientUtility', () => {
  const theme = parseTheme();

  it('compiles directional, radial, conic, and angled gradients', () => {
    expect(compileGradientUtility('bg-linear-to-r/longer', false, theme)?.[0]?.value).toContain(
      'linear-gradient(in oklch longer hue to right',
    );
    expect(compileGradientUtility('bg-radial/oklab', false, theme)?.[0]?.value).toContain('radial-gradient(in oklab');
    expect(compileGradientUtility('bg-conic-30', true, theme)?.[0]?.value).toContain('from -30deg');
    expect(compileGradientUtility('bg-conic', false, theme)?.[0]?.value).toContain('from 0deg');
    expect(compileGradientUtility('bg-conic-[30deg]', false, theme)?.[0]?.value).toContain('from 30deg');
    expect(compileGradientUtility('bg-linear-45', true, theme)?.[0]?.value).toContain('-45deg');
    expect(compileGradientUtility('bg-linear-[45deg]', false, theme)?.[0]?.value).toContain('45deg');
  });

  it('compiles stop positions and stop colors with their shared channels', () => {
    expect(compileGradientUtility('from-50%', false, theme)?.[0]).toEqual({
      property: '--cssx-gradient-from-position',
      value: '50%',
      semanticGroup: 'gradient-from',
    });
    expect(compileGradientUtility('from-red-500', false, theme)).toHaveLength(2);
    expect(compileGradientUtility('via-red-500/50', false, theme)).toHaveLength(2);
    expect(compileGradientUtility('to-blue-500', false, theme)).toHaveLength(1);
    expect(compileGradientUtility('via-[42%]', false, theme)?.[0]?.property).toBe('--cssx-gradient-via-position');
  });

  it('rejects malformed candidates and invalid stop colors or opacity', () => {
    expect(compileGradientUtility('not-a-gradient', false, theme)).toBeNull();
    expect(compileGradientUtility('from-101%', false, theme)).toBeNull();
    expect(compileGradientUtility('from-red-500/none', false, theme)).toBeNull();
    expect(compileGradientUtility('to-not-a-color', false, theme)).toBeNull();
  });
});
