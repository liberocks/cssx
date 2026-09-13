import { describe, expect, it } from 'vitest';

import { compileSpaceUtility } from './compile-space-utility';
import { parseTheme } from './theme';

describe('compileSpaceUtility', () => {
  const theme = parseTheme();

  it('compiles axis-specific sibling spacing and reverse channels', () => {
    expect(compileSpaceUtility('space-y-reverse', false, theme)?.[0]).toMatchObject({
      property: '--cssx-space-y-reverse',
      value: '1',
    });
    expect(compileSpaceUtility('space-x-4', false, theme)).toHaveLength(3);
    expect(compileSpaceUtility('space-y-2', true, theme)?.[1]).toMatchObject({
      property: 'margin-top',
      value: 'calc(calc(0.25rem * -2) * calc(1 - var(--cssx-space-y-reverse)))',
    });
  });

  it('rejects unknown spacing values and utility families', () => {
    expect(compileSpaceUtility('space-x-invalid', false, theme)).toBeNull();
    expect(compileSpaceUtility('space-z-2', false, theme)).toBeNull();
  });
});
