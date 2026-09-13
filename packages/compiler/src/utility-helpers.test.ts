import { describe, expect, it } from 'vitest';

import { parseTheme } from './theme';
import { describeUtilityRecipe, compileUtilities } from './utilities';
import {
  flexValue,
  isLengthCssValue,
  resolveBorderWidthValue,
  resolveDimensionValue,
  resolveOpacityModifier,
  resolveSpacingValue,
  splitColorModifier,
} from './utility-resolvers';

describe('utility helper edge cases', () => {
  const theme = parseTheme();

  it('resolves arbitrary, edge, and invalid numeric values without accepting unsafe fallbacks', () => {
    expect(isLengthCssValue('0')).toBe(true);
    expect(isLengthCssValue('min(1rem,2vw)')).toBe(true);
    expect(isLengthCssValue('length:var(--border-width)')).toBe(true);
    expect(isLengthCssValue('var(--ambiguous)')).toBe(false);
    expect(resolveBorderWidthValue('[3px]')).toBe('3px');
    expect(resolveSpacingValue('px', true, theme)).toBe('-1px');
    expect(resolveSpacingValue('full', false, theme)).toBe('100%');
    expect(resolveSpacingValue('[3ch]', false, theme)).toBe('3ch');
    expect(resolveSpacingValue('2', true, theme)).toBe('calc(0.25rem * -2)');
    expect(flexValue('1/0')).toBeNull();
    expect(resolveDimensionValue('1/0', false, theme, 'w')).toBeNull();
    expect(splitColorModifier('[url("a/b")]/50')).toEqual({ value: '[url("a/b")]', opacity: '50' });
    expect(splitColorModifier('red\\/blue/50')).toEqual({ value: 'red\\/blue', opacity: '50' });
    expect(resolveOpacityModifier('none')).toBeNull();
    expect(resolveOpacityModifier('101')).toBeNull();
  });

  it('covers valid alternatives and guarded rejections in utility resolvers', async () => {
    expect(() => describeUtilityRecipe('unknown-utility', theme)).toThrow('cannot compile utility');
    expect(describeUtilityRecipe('!p-1', theme).atoms[0]?.[0]?.value).toContain('!important');
    await expect(compileUtilities(['animation-name-none'], () => 'x-none')).resolves.toMatchObject({
      entries: [{ candidate: 'animation-name-none' }],
    });
    await expect(
      compileUtilities(
        ['animate-reveal', '[animation:var(--missing)]'],
        () => 'x-animation',
        '@theme { --animate-reveal: reveal 1s; @keyframes reveal { to { opacity: 1; } } }',
      ),
    ).resolves.toMatchObject({ entries: expect.any(Array) });
    await expect(
      compileUtilities(
        ['[animation:var(--missing)]'],
        () => 'x-prefixed-animation',
        '@theme prefix(app) { --animate-reveal: reveal 1s; }',
      ),
    ).resolves.toMatchObject({ entries: expect.any(Array) });

    expect(flexValue('invalid')).toBeNull();
    expect(resolveDimensionValue('1/2', false, theme, 'w')).toBe('50%');
    expect(resolveDimensionValue('1/2', true, theme, 'w')).toBe('-50%');
  });
});
