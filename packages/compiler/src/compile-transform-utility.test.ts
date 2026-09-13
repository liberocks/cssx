import { describe, expect, it } from 'vitest';

import { compileTransformUtility } from './compile-transform-utility';
import { parseTheme } from './theme';

describe('compileTransformUtility', () => {
  const theme = parseTheme();

  it('routes each transform family to its focused compiler', () => {
    for (const utility of [
      'translate-x-2',
      'translate-2',
      'rotate-x-45',
      'rotate-45',
      'scale-x-50',
      'scale-y-50',
      'scale-z-50',
      'scale-50',
      'skew-x-6',
      'skew-y-6',
      'skew-6',
    ]) {
      expect(compileTransformUtility(utility, false, theme), utility).not.toBeNull();
    }
  });

  it('returns null when no transform family accepts the utility', () => {
    expect(compileTransformUtility('unknown-utility', false, theme)).toBeNull();
  });
});
