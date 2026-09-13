import { expect, it } from 'vitest';

import { serializeThemeSignature } from './serialize-theme-signature';
import type { CssxTheme } from './theme';

const theme = (mode: CssxTheme['mode'], prefix = ''): CssxTheme => ({
  tokens: { '--z': 'zed', '--a': 'initial' },
  keyframes: { z: 'frame-z', a: 'frame-a' },
  mode,
  prefix,
});

it('sorts theme tokens and keyframes and represents reset tokens as initial', () => {
  expect(serializeThemeSignature(theme('inline'))).toBe('--a:initial|--z:zed|a:frame-a|z:frame-z');
});

it('includes output mode and prefix for reference themes', () => {
  expect(serializeThemeSignature(theme('reference', 'app'))).toBe(
    'reference:app|--a:initial|--z:zed|a:frame-a|z:frame-z',
  );
});

it('includes a nonempty prefix even when inline output is selected', () => {
  expect(serializeThemeSignature(theme('inline', 'app'))).toBe('inline:app|--a:initial|--z:zed|a:frame-a|z:frame-z');
});
