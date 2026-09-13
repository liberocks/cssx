import { describe, expect, it } from 'vitest';

import { compileContainerUtility } from './compile-container-utility';
import { parseTheme } from './theme';

describe('compileContainerUtility', () => {
  it('returns null for unrelated utilities and builds themed responsive widths', () => {
    const theme = parseTheme();

    expect(compileContainerUtility('not-container', theme)).toBeNull();
    expect(compileContainerUtility('container', theme)).toEqual([
      { property: 'width', value: '100%', semanticGroup: 'container' },
      {
        property: 'max-width',
        value: '40rem',
        atRule: '@media (width >= 40rem)',
        semanticGroup: 'container',
      },
      {
        property: 'max-width',
        value: '48rem',
        atRule: '@media (width >= 48rem)',
        semanticGroup: 'container',
      },
      {
        property: 'max-width',
        value: '64rem',
        atRule: '@media (width >= 64rem)',
        semanticGroup: 'container',
      },
      {
        property: 'max-width',
        value: '80rem',
        atRule: '@media (width >= 80rem)',
        semanticGroup: 'container',
      },
      {
        property: 'max-width',
        value: '96rem',
        atRule: '@media (width >= 96rem)',
        semanticGroup: 'container',
      },
    ]);
  });

  it('keeps the base width when the active theme has no breakpoints', () => {
    const emptyTheme = { tokens: {}, keyframes: {}, mode: 'inline' as const, prefix: '' };

    expect(compileContainerUtility('container', emptyTheme)).toEqual([
      { property: 'width', value: '100%', semanticGroup: 'container' },
    ]);
  });
});
