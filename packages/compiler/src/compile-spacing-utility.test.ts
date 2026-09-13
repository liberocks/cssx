import { describe, expect, it } from 'vitest';

import { compileSpacingUtility } from './compile-spacing-utility';
import { parseTheme } from './theme';

describe('compileSpacingUtility', () => {
  const theme = parseTheme();

  it('compiles spacing, auto margins, and negative positional dimensions', () => {
    expect(compileSpacingUtility('m-auto', false, theme)).toEqual([{ property: 'margin', value: 'auto' }]);
    expect(compileSpacingUtility('inset-x-full', true, theme)).toEqual([
      { property: 'left', value: '-100%' },
      { property: 'right', value: '-100%' },
    ]);
    expect(compileSpacingUtility('p-2', false, theme)).toEqual([{ property: 'padding', value: 'calc(0.25rem * 2)' }]);
    expect(compileSpacingUtility('mt-2', true, theme)).toEqual([
      { property: 'margin-top', value: 'calc(0.25rem * -2)' },
    ]);
  });

  it('rejects malformed or unresolvable spacing values', () => {
    expect(compileSpacingUtility('p-invalid', false, theme)).toBeNull();
    expect(compileSpacingUtility('not-spacing-2', false, theme)).toBeNull();
  });
});
