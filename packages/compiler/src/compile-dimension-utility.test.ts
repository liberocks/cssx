import { describe, expect, it } from 'vitest';

import { compileDimensionUtility } from './compile-dimension-utility';
import { parseTheme } from './theme';

describe('compileDimensionUtility', () => {
  const theme = parseTheme();

  it('maps physical and logical sizing prefixes to their CSS properties', () => {
    const utilities = [
      ['w-4', 'width'],
      ['h-4', 'height'],
      ['min-w-4', 'min-width'],
      ['max-w-4', 'max-width'],
      ['min-h-4', 'min-height'],
      ['max-h-4', 'max-height'],
      ['inline-4', 'inline-size'],
      ['min-inline-4', 'min-inline-size'],
      ['max-inline-4', 'max-inline-size'],
      ['block-4', 'block-size'],
      ['min-block-4', 'min-block-size'],
      ['max-block-4', 'max-block-size'],
    ] as const;

    for (const [utility, property] of utilities) {
      expect(compileDimensionUtility(utility, false, theme), utility).toEqual({
        property,
        value: 'calc(0.25rem * 4)',
      });
    }
  });

  it('supports negative values and rejects unrelated or invalid utilities', () => {
    expect(compileDimensionUtility('w-4', true, theme)).toEqual({
      property: 'width',
      value: 'calc(0.25rem * -4)',
    });
    expect(compileDimensionUtility('height-4', false, theme)).toBeNull();
    expect(compileDimensionUtility('w-invalid', false, theme)).toBeNull();
  });
});
