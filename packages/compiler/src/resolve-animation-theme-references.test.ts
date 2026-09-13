import { expect, it } from 'vitest';

import { resolveAnimationThemeReferences } from './resolve-animation-theme-references';
import type { CssxTheme } from './theme';

const baseTheme: CssxTheme = { tokens: {}, keyframes: {}, mode: 'inline', prefix: '' };

it('leaves values without theme variables untouched', () => {
  expect(resolveAnimationThemeReferences('spin 1s linear infinite', baseTheme)).toBe('spin 1s linear infinite');
});

it('resolves known theme variables to their values', () => {
  const theme: CssxTheme = { tokens: { '--duration': '1s' }, keyframes: {}, mode: 'inline', prefix: '' };
  expect(resolveAnimationThemeReferences('var(--duration) ease', theme)).toBe('1s ease');
});

it('keeps unresolved theme variables as references', () => {
  expect(resolveAnimationThemeReferences('var(--missing) 2s', baseTheme)).toBe('var(--missing) 2s');
});

it('strips a configured prefix before resolving theme tokens', () => {
  const prefixed: CssxTheme = { tokens: { '--duration': '2s' }, keyframes: {}, mode: 'inline', prefix: 'app' };
  expect(resolveAnimationThemeReferences('var(--app-duration)', prefixed)).toBe('2s');
});

it('leaves unprefixed references alone when a prefix is configured', () => {
  const prefixed: CssxTheme = { tokens: {}, keyframes: {}, mode: 'inline', prefix: 'app' };
  expect(resolveAnimationThemeReferences('var(--other)', prefixed)).toBe('var(--other)');
});