import { describe, expect, it } from 'vitest';

import { parseTheme } from '../../theme/theme';
import { compileAnimationUtility } from './compile-animation-utility';

const theme = parseTheme('@theme { --animate-spin: spin 1s linear infinite; }');

describe('compileAnimationUtility', () => {
  it('compiles none, arbitrary, and theme-backed animation values', () => {
    expect(compileAnimationUtility('animate-none', theme)).toEqual({ property: 'animation', value: 'none' });
    expect(compileAnimationUtility('animate-[fade 1s ease-in]', theme)).toEqual({
      property: 'animation',
      value: 'fade 1s ease-in',
    });
    expect(compileAnimationUtility('animate-spin', theme)).toEqual({
      property: 'animation',
      value: 'spin 1s linear infinite',
    });
  });

  it('returns null for unknown and unrelated animation utilities', () => {
    expect(compileAnimationUtility('animate-unknown', parseTheme())).toBeNull();
    expect(compileAnimationUtility('animation-duration-200', theme)).toBeNull();
    expect(compileAnimationUtility('animate-', theme)).toBeNull();
  });
});
