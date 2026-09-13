import { describe, expect, it } from 'vitest';

import { isBorderColorValue } from './is-border-color-value';

describe('isBorderColorValue', () => {
  it('recognizes named palette values and opacity modifiers as colors', () => {
    expect(isBorderColorValue('red-500')).toBe(true);
    expect(isBorderColorValue('current')).toBe(true);
    expect(isBorderColorValue('transparent/50')).toBe(true);
  });

  it('distinguishes arbitrary colors from arbitrary lengths and rejects invalid values', () => {
    expect(isBorderColorValue('[#123456]')).toBe(true);
    expect(isBorderColorValue('[length:2px]')).toBe(false);
    expect(isBorderColorValue('unknown')).toBe(false);
  });
});
