import { describe, expect, it } from 'vitest';

import { parseTheme } from './parse-theme';
import { resolveThemeValue } from './resolve-theme-value';

describe('resolveThemeValue', () => {
  it('resolves concrete token values through nested references', () => {
    const theme = parseTheme('@theme { --color-brand: var(--color-base); --color-base: #123456; }');

    expect(resolveThemeValue(theme, '--color-brand')).toBe('#123456');
    expect(resolveThemeValue(theme, '--color-base')).toBe('#123456');
  });

  it('returns undefined for missing and reset values', () => {
    expect(resolveThemeValue(parseTheme(), '--color-missing')).toBeUndefined();
    expect(resolveThemeValue(parseTheme('@theme { --spacing: initial; }'), '--spacing')).toBeUndefined();
  });

  it('rejects circular and unknown references', () => {
    expect(() =>
      resolveThemeValue(parseTheme('@theme { --color-a: var(--color-b); --color-b: var(--color-a); }'), '--color-a'),
    ).toThrow('Circular');
    expect(() => resolveThemeValue(parseTheme('@theme { --color-a: var(--color-missing); }'), '--color-a')).toThrow(
      'Unknown',
    );
  });
});
