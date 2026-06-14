import { describe, expect, it } from 'vitest';
import { compileColorUtility, compileGradientUtility, resolveUtilityColor } from '../src/utility-paint';
import {
  flexValue,
  resolveBorderWidthValue,
  resolveDimensionValue,
  resolveOpacityModifier,
  resolveSpacingValue,
  splitColorModifier,
} from '../src/utility-resolvers';
import { compileAnimationUtility, compileArbitraryProperty, compileTransformUtility } from '../src/utility-transform';
import { parseTheme } from '../src/theme';

describe('utility helper edge cases', () => {
  const theme = parseTheme();

  it('resolves arbitrary, edge, and invalid numeric values without accepting unsafe fallbacks', () => {
    expect(resolveBorderWidthValue('[3px]')).toBe('3px');
    expect(resolveSpacingValue('px', true, theme)).toBe('-1px');
    expect(resolveSpacingValue('full', false, theme)).toBe('100%');
    expect(resolveSpacingValue('[3ch]', false, theme)).toBe('3ch');
    expect(flexValue('1/0')).toBeNull();
    expect(resolveDimensionValue('1/0', false, theme, 'w')).toBeNull();
    expect(splitColorModifier('[url("a/b")]/50')).toEqual({ value: '[url("a/b")]', opacity: '50' });
    expect(splitColorModifier('red\\/blue/50')).toEqual({ value: 'red\\/blue', opacity: '50' });
