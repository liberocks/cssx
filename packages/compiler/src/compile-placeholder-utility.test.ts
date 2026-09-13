import { describe, expect, it } from 'vitest';

import { compilePlaceholderUtility } from './compile-placeholder-utility';
import { parseTheme } from './theme';

describe('compilePlaceholderUtility', () => {
  const theme = parseTheme();

  it('compiles placeholder colors with and without opacity', () => {
    expect(compilePlaceholderUtility('placeholder-red-500/50', theme)?.[0]).toMatchObject({
      property: 'color',
      selectorSuffix: '::placeholder',
    });
    expect(compilePlaceholderUtility('placeholder-red-500/50', theme)?.[0]?.value).toContain('color-mix');
    expect(compilePlaceholderUtility('placeholder-red-500', theme)?.[0]?.value).toContain('oklch');
  });

  it('rejects invalid opacity, colors, and utility names', () => {
    expect(compilePlaceholderUtility('placeholder-red-500/101', theme)).toBeNull();
    expect(compilePlaceholderUtility('placeholder-not-a-color', theme)).toBeNull();
    expect(compilePlaceholderUtility('not-placeholder-red-500', theme)).toBeNull();
  });
});
