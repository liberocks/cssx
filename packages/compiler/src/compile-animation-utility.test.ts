import { describe, expect, it } from 'vitest';

import { compileAnimationUtility } from './compile-animation-utility';
import { parseTheme } from './theme';

describe('compileAnimationUtility', () => {
  it('compiles none, arbitrary, and theme-backed animation values', () => {
    const theme = parseTheme('@theme { --animate-spin: spin 1s linear infinite; }');

    expect(compileAnimationUtility('none', theme)).toEqual({ property: 'animation', value: 'none' });
    expect(compileAnimationUtility('[fade 1s_ease-in]', theme)).toEqual({
      property: 'animation',
      value: 'fade 1s_ease-in',
    });
    expect(compileAnimationUtility('spin', theme)).toEqual({
      property: 'animation',
      value: 'spin 1s linear infinite',
    });
  });

  it('returns null for an unknown named animation', () => {
    expect(compileAnimationUtility('unknown', parseTheme())).toBeNull();
  });
});
