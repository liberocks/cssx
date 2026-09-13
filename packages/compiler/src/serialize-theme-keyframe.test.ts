import { describe, expect, it } from 'vitest';

import { parseTheme } from './parse-theme';
import { serializeThemeKeyframe } from './serialize-theme-keyframe';

describe('serializeThemeKeyframe', () => {
  it('rewrites referenced theme values in a known keyframe and ignores missing names', () => {
    const theme = parseTheme(
      '@theme prefix(app) { --color-brand: #123456; @keyframes fade { to { color: var(--color-brand); } } }',
    );

    expect(serializeThemeKeyframe(theme, 'fade')).toContain('var(--app-color-brand)');
    expect(serializeThemeKeyframe(theme, 'missing')).toBeUndefined();
  });
});
