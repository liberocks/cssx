import { describe, expect, it } from 'vitest';

import { compilePrefixedFlexUtility } from './compile-prefixed-flex-utility';
import { parseTheme } from './theme';

describe('compilePrefixedFlexUtility', () => {
  const theme = parseTheme();

  it('compiles named, fractional, and arbitrary flex values', () => {
    expect(compilePrefixedFlexUtility('basis-4', false, theme)).toEqual({
      property: 'flex-basis',
      value: 'calc(0.25rem * 4)',
    });
    expect(compilePrefixedFlexUtility('basis-4', true, theme)).toEqual({
      property: 'flex-basis',
      value: 'calc(0.25rem * -4)',
    });
    expect(compilePrefixedFlexUtility('flex-1/2', false, theme)).toEqual({
      property: 'flex',
      value: 'calc(1 / 2 * 100%)',
    });
    expect(compilePrefixedFlexUtility('flex-[1_0_auto]', false, theme)).toEqual({
      property: 'flex',
      value: '1 0 auto',
    });
  });

  it('rejects invalid and unrelated candidates', () => {
    expect(compilePrefixedFlexUtility('basis-invalid', false, theme)).toBeNull();
    expect(compilePrefixedFlexUtility('flex-1/0', false, theme)).toBeNull();
    expect(compilePrefixedFlexUtility('grid-cols-3', false, theme)).toBeNull();
  });
});
