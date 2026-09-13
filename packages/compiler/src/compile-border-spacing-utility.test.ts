import { describe, expect, it } from 'vitest';

import { compileBorderSpacingUtility } from './compile-border-spacing-utility';
import { parseTheme } from './theme';

const theme = parseTheme();

describe('compileBorderSpacingUtility', () => {
  it('compiles a shared border-spacing value', () => {
    expect(compileBorderSpacingUtility('border-spacing-2', false, theme)).toEqual({
      property: 'border-spacing',
      value: 'calc(0.25rem * 2)',
    });
  });

  it('uses independent horizontal and vertical channels', () => {
    expect(compileBorderSpacingUtility('border-spacing-x-4', false, theme)).toEqual([
      { property: '--cssx-border-spacing-x', value: 'calc(0.25rem * 4)', semanticGroup: 'border-spacing-x' },
      {
        property: 'border-spacing',
        value: 'var(--cssx-border-spacing-x, 0) var(--cssx-border-spacing-y, 0)',
        semanticGroup: 'border-spacing-x',
      },
    ]);
    expect(compileBorderSpacingUtility('border-spacing-y-px', false, theme)).toEqual([
      { property: '--cssx-border-spacing-y', value: '1px', semanticGroup: 'border-spacing-y' },
      {
        property: 'border-spacing',
        value: 'var(--cssx-border-spacing-x, 0) var(--cssx-border-spacing-y, 0)',
        semanticGroup: 'border-spacing-y',
      },
    ]);
  });

  it('supports negative values and rejects unsupported candidates', () => {
    expect(compileBorderSpacingUtility('border-spacing-2', true, theme)).toEqual({
      property: 'border-spacing',
      value: 'calc(0.25rem * -2)',
    });
    expect(compileBorderSpacingUtility('border-spacing-z-2', false, theme)).toBeNull();
    expect(compileBorderSpacingUtility('border-spacing-invalid', false, theme)).toBeNull();
    expect(compileBorderSpacingUtility('p-4', false, theme)).toBeNull();
  });
});
