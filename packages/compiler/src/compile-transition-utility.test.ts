import { expect, it } from 'vitest';

import { compileTransitionUtility } from './compile-transition-utility';
import { parseTheme } from './theme';

it('resolves transition-property shorthands and arbitrary property lists', () => {
  expect(compileTransitionUtility('transition-transform-opacity', false, parseTheme())).toHaveLength(3);
  expect(compileTransitionUtility('transition-[opacity,_transform]', false, parseTheme())).toEqual(
    expect.arrayContaining([expect.objectContaining({ property: 'transition-property', value: 'opacity, transform' })]),
  );
  expect(compileTransitionUtility('transition-colors', false, parseTheme())).toBeNull();
});

it('resolves duration, delay, and easing values with negative-form rules', () => {
  const theme = parseTheme('@theme { --duration-fast: 120ms; --ease-custom: linear(0, 1); }');
  expect(compileTransitionUtility('duration-fast', false, theme)).toEqual({
    property: 'transition-duration',
    value: '120ms',
  });
  expect(compileTransitionUtility('duration-100', true, theme)).toBeNull();
  expect(compileTransitionUtility('delay-100', true, theme)).toEqual({
    property: 'transition-delay',
    value: '-100ms',
  });
  expect(compileTransitionUtility('ease-custom', false, theme)).toEqual({
    property: 'transition-timing-function',
    value: 'linear(0, 1)',
  });
  expect(compileTransitionUtility('ease-custom', true, theme)).toBeNull();
  expect(compileTransitionUtility('duration-unknown', false, theme)).toBeNull();
  expect(compileTransitionUtility('transition-none', false, theme)).toBeNull();
});
