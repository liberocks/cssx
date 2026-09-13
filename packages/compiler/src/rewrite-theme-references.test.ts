import { expect, it } from 'vitest';

import { rewriteThemeReferences } from './rewrite-theme-references';

it('rewrites custom property references for prefixed theme output', () => {
  const theme = { tokens: {}, keyframes: {}, mode: 'reference' as const, prefix: 'app' };

  expect(rewriteThemeReferences(theme, 'calc(var(--spacing) * var(--size))')).toBe(
    'calc(var(--app-spacing) * var(--app-size))',
  );
});
