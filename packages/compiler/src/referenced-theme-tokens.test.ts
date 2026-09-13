import { expect, it } from 'vitest';
import { referencedThemeTokens } from './referenced-theme-tokens';

it('collects referenced tokens and transitive dependencies for prefixed and unprefixed output', () => {
  const baseTheme = {
    tokens: { '--color-brand': 'var(--color-base)', '--color-base': '#123', '--spacing': '1rem' },
    keyframes: {},
    mode: 'reference' as const,
  };

  expect(referencedThemeTokens({ ...baseTheme, prefix: '' }, '.x{color:var(--color-brand)}')).toEqual([
    '--color-brand',
    '--color-base',
  ]);
  expect(referencedThemeTokens({ ...baseTheme, prefix: 'app' }, '.x{color:var(--app-color-brand)}')).toEqual([
    '--color-brand',
    '--color-base',
  ]);
});

it('ignores CSS variables that are not defined by the active theme', () => {
  const theme = { tokens: { '--spacing': '1rem' }, keyframes: {}, mode: 'reference' as const, prefix: '' };

  expect(referencedThemeTokens(theme, '.x{color:var(--external-color)}')).toEqual([]);
});
