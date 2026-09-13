import { expect, it } from 'vitest';

import { compileAnimationLonghandUtility } from './compile-animation-longhand-utility';
import { parseTheme } from './theme';

it('resolves named, arbitrary, and theme animation names', () => {
  const theme = parseTheme('@theme { @keyframes reveal { to { opacity: 1; } } }');
  expect(compileAnimationLonghandUtility('animation-name-none', false, theme)).toEqual({
    property: 'animation-name',
    value: 'none',
  });
  expect(compileAnimationLonghandUtility('animation-name-[fade-in]', false, theme)?.value).toBe('fade-in');
  expect(compileAnimationLonghandUtility('animation-name-reveal', false, theme)?.value).toBe('reveal');
  expect(compileAnimationLonghandUtility('animation-name-reveal', true, theme)).toBeNull();
  expect(compileAnimationLonghandUtility('animation-name-missing', false, theme)).toBeNull();
});

it('resolves animation timing and longhand controls', () => {
  const theme = parseTheme('@theme { --animation-delay-long: 300ms; --animation-ease-custom: linear(0, 1); }');
  expect(compileAnimationLonghandUtility('animation-duration-auto', false, theme)?.value).toBe('auto');
  expect(compileAnimationLonghandUtility('animation-duration-100', true, theme)).toBeNull();
  expect(compileAnimationLonghandUtility('animation-delay-long', false, theme)?.value).toBe('300ms');
  expect(compileAnimationLonghandUtility('animation-delay-100', true, theme)?.value).toBe('-100ms');
  expect(compileAnimationLonghandUtility('animation-ease-custom', false, theme)?.value).toBe('linear(0, 1)');
  expect(compileAnimationLonghandUtility('animation-ease-custom', true, theme)).toBeNull();
  expect(compileAnimationLonghandUtility('animation-iterations-infinite', false, theme)?.value).toBe('infinite');
  expect(compileAnimationLonghandUtility('animation-iterations-[2.5]', false, theme)?.value).toBe('2.5');
  expect(compileAnimationLonghandUtility('animation-iterations-invalid', false, theme)).toBeNull();
  expect(compileAnimationLonghandUtility('animation-direction-reverse', false, theme)?.value).toBe('reverse');
  expect(compileAnimationLonghandUtility('animation-fill-both', false, theme)?.value).toBe('both');
  expect(compileAnimationLonghandUtility('animation-paused', false, theme)?.value).toBe('paused');
  expect(compileAnimationLonghandUtility('animation-composition-add', false, theme)?.value).toBe('add');
  expect(compileAnimationLonghandUtility('animation-composition-add', true, theme)).toBeNull();
  expect(compileAnimationLonghandUtility('animation-unknown', false, theme)).toBeNull();
});
