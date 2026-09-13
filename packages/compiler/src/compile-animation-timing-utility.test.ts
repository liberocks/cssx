import { expect, it } from 'vitest';

import { compileAnimationTimingUtility } from './compile-animation-timing-utility';
import { parseTheme } from './theme';

it('resolves animation durations, delays, and custom easing values', () => {
  const theme = parseTheme('@theme { --animation-delay-long: 300ms; --animation-ease-custom: linear(0, 1); }');
  expect(compileAnimationTimingUtility('animation-duration-auto', false, theme)).toEqual({
    property: 'animation-duration',
    value: 'auto',
  });
  expect(compileAnimationTimingUtility('animation-delay-long', false, theme)?.value).toBe('300ms');
  expect(compileAnimationTimingUtility('animation-delay-100', true, theme)?.value).toBe('-100ms');
  expect(compileAnimationTimingUtility('animation-ease-custom', false, theme)?.value).toBe('linear(0, 1)');
});

it('rejects unsupported timing values and negative forms', () => {
  const theme = parseTheme();
  expect(compileAnimationTimingUtility('animation-duration-100', true, theme)).toBeNull();
  expect(compileAnimationTimingUtility('animation-ease-linear', true, theme)).toBeNull();
  expect(compileAnimationTimingUtility('animation-delay-invalid', false, theme)).toBeNull();
  expect(compileAnimationTimingUtility('animation-iterations-2', false, theme)).toBeNull();
});
