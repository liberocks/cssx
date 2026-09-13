import { describe, expect, it } from 'vitest';

import { parseTheme } from './parse-theme';
import { resolveThemeToken } from './resolve-theme-token';

describe('resolveThemeToken', () => {
  it('returns concrete values for inline themes and prefixed variables for reference themes', () => {
    expect(resolveThemeToken(parseTheme('@theme { --color-brand: #123456; }'), '--color-brand')).toBe('#123456');
    expect(resolveThemeToken(parseTheme('@theme reference { --color-brand: #123456; }'), '--color-brand')).toBe(
      'var(--color-brand)',
    );
    expect(resolveThemeToken(parseTheme('@theme prefix(app) { --color-brand: #123456; }'), '--color-brand')).toBe(
      'var(--app-color-brand)',
    );
  });

  it('returns undefined for absent and reset tokens', () => {
    expect(resolveThemeToken(parseTheme(), '--color-missing')).toBeUndefined();
    expect(resolveThemeToken(parseTheme('@theme { --spacing: initial; }'), '--spacing')).toBeUndefined();
  });

  it('propagates unknown and circular token reference errors', () => {
    expect(() =>
      resolveThemeToken(parseTheme('@theme { --color-a: var(--color-b); --color-b: var(--color-a); }'), '--color-a'),
    ).toThrow('Circular');
    expect(() => resolveThemeToken(parseTheme('@theme { --color-a: var(--color-missing); }'), '--color-a')).toThrow(
      'Unknown',
    );
  });
});
