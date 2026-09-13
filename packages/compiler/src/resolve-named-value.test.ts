import { describe, expect, it } from 'vitest';

import { resolveNamedValue } from './resolve-named-value';
import { parseTheme } from './theme';

describe('resolveNamedValue', () => {
  it('prefers arbitrary syntax and otherwise looks up the theme token', () => {
    const theme = parseTheme();
    expect(resolveNamedValue('[12px]', '--size-custom', theme)).toBe('12px');
    expect(resolveNamedValue('(--size)', '--size-custom', theme)).toBe('var(--size)');
    expect(
      resolveNamedValue('custom', '--size-custom', {
        ...theme,
        tokens: { ...theme.tokens, '--size-custom': '24px' },
      }),
    ).toBe('24px');
    expect(resolveNamedValue('missing', '--size-missing', theme)).toBeNull();
  });
});
