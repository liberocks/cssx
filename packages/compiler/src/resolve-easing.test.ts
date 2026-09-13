import { describe, expect, it } from 'vitest';

import { resolveEasing } from './resolve-easing';
import { parseTheme } from './theme';

describe('resolveEasing', () => {
  it('resolves built-ins, arbitrary easing, and transition tokens', () => {
    const theme = parseTheme('@theme { --ease-smooth: cubic-bezier(.1, .8, .2, 1); }');
    expect(resolveEasing('in', theme)).toBe('cubic-bezier(.4, 0, 1, 1)');
    expect(resolveEasing('[steps(4,_end)]', theme)).toBe('steps(4, end)');
    expect(resolveEasing('smooth', theme)).toBe('cubic-bezier(.1, .8, .2, 1)');
  });

  it('resolves animation-specific easing tokens and returns null for unknown names', () => {
    const theme = parseTheme('@theme { --animation-ease-only: linear(0, 1); }');
    expect(resolveEasing('only', theme, true)).toBe('linear(0, 1)');
    expect(resolveEasing('only', theme)).toBeNull();
    expect(resolveEasing('missing', theme, true)).toBeNull();
  });
});
