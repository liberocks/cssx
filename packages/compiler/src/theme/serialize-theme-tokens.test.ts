import { describe, expect, it } from 'vitest';

import { parseTheme } from './parse-theme';
import { serializeThemeTokens } from './serialize-theme-tokens';

describe('serializeThemeTokens', () => {
  it('omits inline themes and unused reference themes', () => {
    expect(serializeThemeTokens(parseTheme(), '.x{color:red;}')).toBe('');
    const reference = parseTheme('@theme reference { --color-brand: #123456; }');
    expect(serializeThemeTokens(reference, '')).toBe('');
    expect(serializeThemeTokens(reference, '.x{color:var(--unknown);}')).toBe('');
  });

  it('serializes referenced values and rewrites variable prefixes', () => {
    const reference = parseTheme('@theme reference { --color-brand: var(--color-base); --color-base: #123456; }');
    expect(serializeThemeTokens(reference, '.x{color:var(--color-brand);}')).toBe(
      ':root{--color-base:#123456;--color-brand:var(--color-base)}',
    );

    const prefixed = parseTheme('@theme prefix(app) { --color-brand: #123456; }');
    expect(serializeThemeTokens(prefixed, '.x{color:var(--app-color-brand);}')).toBe(
      ':root{--app-color-brand:#123456}',
    );
  });

  it('serializes all tokens for static themes regardless of utility references', () => {
    const staticTheme = parseTheme('@theme static { --color-brand: #123456; }');
    expect(serializeThemeTokens(staticTheme, '')).toContain('--color-brand:#123456');
  });
});
