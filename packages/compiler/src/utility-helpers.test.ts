import { describe, expect, it } from 'vitest';

import { parseTheme } from './theme';
import { describeUtilityRecipe, compileUtilities } from './utilities';
import { compileCoreLayoutUtility, compileContainerUtility } from './utility-layout';
import { compilePrefixedUtility } from './utility-prefixed';
import {
  flexValue,
  isLengthCssValue,
  resolveBorderWidthValue,
  resolveDimensionValue,
  resolveOpacityModifier,
  resolveSpacingValue,
  splitColorModifier,
} from './utility-resolvers';
import {
  compileAnimationUtility,
  compileArbitraryProperty,
  compileDimensionUtility,
  compileTransformUtility,
} from './utility-transform';
import { compileBackgroundUtility, compileMaskUtility, compileNumericUtility } from './utility-visual-basics';

describe('utility helper edge cases', () => {
  const theme = parseTheme();
  const emptyTheme = { tokens: {}, keyframes: {}, mode: 'inline' as const, prefix: '' };

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

  it('keeps special colors and rejects invalid transform and arbitrary-property input', () => {
    expect(compileAnimationUtility('none', theme)).toEqual({ property: 'animation', value: 'none' });
    expect(compilePrefixedUtility('leading-6', false, emptyTheme)).toBeNull();
    expect(compileTransformUtility('translate-x-1/2', true, theme)?.[0]).toEqual({
      property: '--cssx-translate-x',
      value: '-50%',
    });
    expect(compileTransformUtility('translate-x-invalid', false, theme)).toBeNull();
    expect(compileTransformUtility('scale-invalid', false, theme)).toBeNull();
    expect(compileTransformUtility('skew-x-invalid', false, theme)).toBeNull();
    expect(() => compileArbitraryProperty('[123:unsafe]')).toThrow('Invalid arbitrary CSSX utility');
  });

  it('resolves layout, modern platform, and visual utility alternatives', () => {
    expect(compileContainerUtility('not-container', theme)).toBeNull();
    expect(compileContainerUtility('container', theme)).toHaveLength(6);
    expect(compileCoreLayoutUtility('overflow-x-scroll', false, theme)).toEqual({
      property: 'overflow-x',
      value: 'scroll',
    });
    expect(compileCoreLayoutUtility('overscroll-y-contain', false, theme)).toEqual({
      property: 'overscroll-behavior-y',
      value: 'contain',
    });
    expect(compileCoreLayoutUtility('aspect-[4/3]', false, theme)).toEqual({ property: 'aspect-ratio', value: '4/3' });
    expect(compileCoreLayoutUtility('size-invalid', false, theme)).toBeNull();
    expect(compileCoreLayoutUtility('start-2', false, theme)).toEqual({
      property: 'inset-inline-start',
      value: 'calc(0.25rem * 2)',
    });
    expect(compileCoreLayoutUtility('auto-rows-min', false, theme)).toEqual({
      property: 'grid-auto-rows',
      value: 'min-content',
    });
    expect(compileCoreLayoutUtility('scroll-px-2', false, theme)).toHaveLength(2);
    expect(compileCoreLayoutUtility('scroll-px-invalid', false, theme)).toBeNull();
    expect(compileCoreLayoutUtility('scrollbar-thumb-red-500/50', false, theme)).toHaveLength(2);
    expect(compileCoreLayoutUtility('scrollbar-track-red-500/101', false, theme)).toBeNull();
    expect(compileBackgroundUtility('bg-clip-text')).toHaveLength(3);
    expect(compileBackgroundUtility('bg-position-[25%_75%]')).toEqual({
      property: 'background-position',
      value: '25% 75%',
    });
    expect(compileBackgroundUtility('bg-size-[auto_100%]')).toEqual({
      property: 'background-size',
      value: 'auto 100%',
    });
    expect(compileMaskUtility('mask-position-[center]', theme)).toEqual({ property: 'mask-position', value: 'center' });
    expect(compileMaskUtility('mask-[url("/mask.svg")]', theme)).toEqual({
      property: 'mask-image',
      value: 'url("/mask.svg")',
    });
    expect(compileNumericUtility('normal-nums')).toHaveLength(1);
    expect(compileNumericUtility('tabular-nums')).toHaveLength(2);
  });

  it('covers filter, transform, and motion value branches', () => {
    expect(compileTransformUtility('rotate-[15deg]', true, theme)?.[0]).toEqual({
      property: 'rotate',
      value: '-15deg',
    });
    expect(compileTransformUtility('scale-50', false, theme)).toHaveLength(3);
    expect(compileTransformUtility('skew-y-6', true, theme)?.[0]).toEqual({
      property: '--cssx-skew-y',
      value: '-6deg',
    });
    expect(compileTransformUtility('rotate-x-invalid', false, theme)).toBeNull();
    expect(compileTransformUtility('skew-invalid', false, theme)).toBeNull();
    expect(compilePrefixedUtility('indent-invalid', false, theme)).toBeNull();
  });

  it('routes every documented prefixed alternative to a declaration recipe', () => {
    const candidates = [
      'border-spacing-2',
      'border-spacing-x-2',
      'columns-[18rem]',
      'content-none',
      "content-['required']",
      'break-before-left',
      'break-inside-avoid-column',
      'object-[25%_75%]',
      'tab-[8]',
      'list-image-[url("/marker.svg")]',
      'line-clamp-none',
      'line-clamp-3',
      'grid-cols-subgrid',
      'grid-cols-[18rem_1fr]',
      'grid-rows-3',
      'grid-rows-subgrid',
      'grid-rows-(--dashboard-rows)',
      'col-span-full',
      'row-span-2',
      'col-start-auto',
      'row-end-3',
      '-order-first',
      'order-2',
      'basis-1/3',
      'flex-1',
      'flex-[1_0_auto]',
      'opacity-50',
      'z-auto',
      'leading-[1.25]',
      'leading-6',
      'font-[Inter]',
      'tracking-widest',
      'tracking-[0.03em]',
      'tracking-(--headline-spacing)',
      'shadow-[inset_0_0_0_1px_#36c]',
      'animate-none',
      'translate-x-2',
      'rotate-45',
      'scale-x-50',
      'scale-y-50',
      'skew-x-6',
      'duration-150',
      '-delay-150',
      'ease-in',
      'animation-duration-150',
      '-animation-delay-150',
      'animation-ease-in',
      'animation-fill-both',
      'animation-running',
      'stagger-150',
      'animation-timeline-view-x',
      'scroll-timeline-name-[--reading]',
      'view-timeline-name-[--reading]',
      'scroll-timeline-axis-block',
      'view-timeline-axis-inline',
      'view-timeline-inset-[10%]',
      'timeline-scope-[--reading]',
      'animation-range-[entry_0%_exit_100%]',
      'view-transition-name-none',
      'view-transition-class-[card_shared]',
      'content-visibility-hidden',
      'contain-layout',
      'contain-intrinsic-block-size-[20px]',
      'stroke-miterlimit-4',
      'stroke-dashoffset-[2px]',
      'mask-repeat-x',
      'bg-repeat-space',
      'bg-size-[auto_100%]',
      'from-red-500',
      'to-red-500',
      'decoration-wavy',
      'accent-red-500',
      'ring-2',
      'ring-offset-red-500',
      'blur-[2px]',
      'backdrop-hue-rotate-45',
    ];

    for (const candidate of candidates) {
      const negative = candidate.startsWith('-');
      expect(
        compilePrefixedUtility(negative ? candidate.slice(1) : candidate, negative, theme),
        candidate,
      ).not.toBeNull();
    }
    for (const candidate of ['duration-unknown', 'columns-invalid', 'grid-cols-invalid', 'animation-range-invalid']) {
      expect(compilePrefixedUtility(candidate, false, theme), candidate).toBeNull();
    }
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

    expect(compileContainerUtility('container', emptyTheme)).toEqual([
      { property: 'width', value: '100%', semanticGroup: 'container' },
    ]);
    expect(compileCoreLayoutUtility('overscroll-contain', false, theme)).toEqual({
      property: 'overscroll-behavior',
      value: 'contain',
    });
    expect(compileCoreLayoutUtility('overscroll-x-auto', false, theme)).toEqual({
      property: 'overscroll-behavior-x',
      value: 'auto',
    });
    expect(compileCoreLayoutUtility('end-2', false, theme)).toMatchObject({ property: 'inset-inline-end' });
    expect(compileCoreLayoutUtility('end-invalid', false, theme)).toBeNull();
    expect(compileCoreLayoutUtility('stroke-3', false, theme)).toEqual({ property: 'stroke-width', value: '3' });
    expect(compileCoreLayoutUtility('scrollbar-thumb-invalid', false, theme)).toBeNull();

    expect(compilePrefixedUtility('basis-invalid', false, theme)).toBeNull();
    expect(compilePrefixedUtility('flex-1/0', false, theme)).toBeNull();
    expect(compileDimensionUtility('w-4', false, theme)?.property).toBe('width');
    expect(compileTransformUtility('rotate-invalid', false, theme)).toBeNull();
    expect(flexValue('invalid')).toBeNull();
    expect(resolveDimensionValue('1/2', false, theme, 'w')).toBe('50%');
    expect(resolveDimensionValue('1/2', true, theme, 'w')).toBe('-50%');
  });
});
