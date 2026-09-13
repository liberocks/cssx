import { describe, expect, it } from 'vitest';

import { compileDivideUtility } from './compile-divide-utility';
import { parseTheme } from './theme';

describe('compileDivideUtility', () => {
  const theme = parseTheme();

  it('compiles divider widths and reverse channels on both axes', () => {
    expect(compileDivideUtility('divide-y', theme)).toHaveLength(3);
    expect(compileDivideUtility('divide-x-2', theme)?.[1]).toMatchObject({ property: 'border-left-width' });
    expect(compileDivideUtility('divide-y-reverse', theme)?.[0]).toMatchObject({ value: '1' });
  });

  it('compiles divider colors with opacity and rejects unsupported values', () => {
    expect(compileDivideUtility('divide-red-500/50', theme)?.[0]?.value).toContain('color-mix');
    expect(compileDivideUtility('divide-red-500', theme)?.[0]).toMatchObject({ property: 'border-color' });
    expect(compileDivideUtility('divide-red-500/101', theme)).toBeNull();
    expect(compileDivideUtility('divide-not-a-color', theme)).toBeNull();
    expect(compileDivideUtility('divide-x-invalid', theme)).toBeNull();
    expect(compileDivideUtility('not-divide-utility', theme)).toBeNull();
  });
});
