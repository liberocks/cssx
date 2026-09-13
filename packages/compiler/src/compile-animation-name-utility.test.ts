import { expect, it } from 'vitest';

import { compileAnimationNameUtility } from './compile-animation-name-utility';
import { parseTheme } from './theme';

const theme = parseTheme('@theme { @keyframes reveal { to { opacity: 1; } } }');

it('resolves fixed, arbitrary, and theme-defined animation names', () => {
  expect(compileAnimationNameUtility('animation-name-none', false, theme)).toEqual({
    property: 'animation-name',
    value: 'none',
  });
  expect(compileAnimationNameUtility('animation-name-[fade-in]', false, theme)?.value).toBe('fade-in');
  expect(compileAnimationNameUtility('animation-name-reveal', false, theme)?.value).toBe('reveal');
});

it('rejects negative, unknown, and unrelated animation names', () => {
  expect(compileAnimationNameUtility('animation-name-reveal', true, theme)).toBeNull();
  expect(compileAnimationNameUtility('animation-name-missing', false, theme)).toBeNull();
  expect(compileAnimationNameUtility('animation-delay-100', false, theme)).toBeNull();
});
