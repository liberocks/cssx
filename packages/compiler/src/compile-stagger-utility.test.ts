import { expect, it } from 'vitest';

import { compileStaggerUtility } from './compile-stagger-utility';
import { parseTheme } from './theme';

it('resolves shared transition and animation stagger delay formulas', () => {
  expect(compileStaggerUtility('delay-stagger', false, parseTheme())).toMatchObject({
    property: 'transition-delay',
    value: expect.stringContaining('--cssx-stagger-index'),
  });
  expect(compileStaggerUtility('animation-delay-stagger', false, parseTheme())).toMatchObject({
    property: 'animation-delay',
    value: expect.stringContaining('--cssx-stagger-count'),
  });
  expect(compileStaggerUtility('delay-stagger', true, parseTheme())).toBeNull();
});

it('resolves stagger values, reverse state, and integer index/count values', () => {
  const theme = parseTheme('@theme { --stagger-gentle: 40ms; }');
  expect(compileStaggerUtility('stagger-gentle', false, theme)).toEqual({
    property: '--cssx-stagger',
    value: '40ms',
  });
  expect(compileStaggerUtility('stagger-reverse', false, theme)).toEqual({
    property: '--cssx-stagger-reverse',
    value: '1',
  });
  expect(compileStaggerUtility('stagger-index-[2]', false, theme)).toEqual({
    property: '--cssx-stagger-index',
    value: '2',
  });
  expect(compileStaggerUtility('stagger-count-4', false, theme)?.value).toBe('4');
  expect(compileStaggerUtility('stagger-100', true, theme)).toBeNull();
  expect(compileStaggerUtility('stagger-unknown', false, theme)).toBeNull();
  expect(compileStaggerUtility('stagger-index-2', true, theme)).toBeNull();
  expect(compileStaggerUtility('stagger-index-x', false, theme)).toBeNull();
  expect(compileStaggerUtility('other', false, theme)).toBeNull();
});
