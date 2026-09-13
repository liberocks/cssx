import { describe, expect, it } from 'vitest';

import { resolveTime } from './resolve-time';
import { parseTheme } from './theme';

describe('resolveTime', () => {
  it('resolves numeric, arbitrary, shorthand, and theme-backed time values', () => {
    const theme = parseTheme('@theme { --duration-fast: 120ms; }');
    expect(resolveTime('100', '--duration-', theme)).toBe('100ms');
    expect(resolveTime('[250ms]', '--duration-', theme)).toBe('250ms');
    expect(resolveTime('(--time)', '--duration-', theme)).toBe('var(--time)');
    expect(resolveTime('fast', '--duration-', theme)).toBe('120ms');
  });

  it('returns null when neither arbitrary syntax nor a theme token resolves', () => {
    expect(resolveTime('unknown', '--duration-', parseTheme())).toBeNull();
  });
});
