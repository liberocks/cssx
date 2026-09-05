import { describe, expect, it } from 'vitest';
import {
  compileColorUtility,
  compileGradientUtility,
  compileTextDecorationUtility,
  resolveUtilityColor,
} from '../src/utility-paint';
import {
  flexValue,
  resolveBorderWidthValue,
  resolveDimensionValue,
  resolveOpacityModifier,
  resolveSpacingValue,
  splitColorModifier,
} from '../src/utility-resolvers';
import {
  compileAnimationUtility,
  compileArbitraryProperty,
  compileDimensionUtility,
  compileTransformUtility,
} from '../src/utility-transform';
import {
  compileBorderWidthUtility,
  compileDivideUtility,
  compileOutlineUtility,
  compilePlaceholderUtility,
  compileSpaceUtility,
  compileSpacingUtility,
} from '../src/utility-box-model';
import { compileCoreLayoutUtility, compileContainerUtility } from '../src/utility-layout';
import { compileModernUtility } from '../src/utility-modern';
import { compileMotionUtility, isMotionUtilityCandidate } from '../src/utility-motion';
import { compileBackgroundUtility, compileMaskUtility, compileNumericUtility } from '../src/utility-visual-basics';
import { compileBackdropFilterUtility, compileFilterUtility, compileRingUtility } from '../src/utility-effects';
import { compilePrefixedUtility } from '../src/utility-prefixed';
import { describeUtilityRecipe, compileUtilities } from '../src/utilities';
import { parseTheme } from '../src/theme';

describe('utility helper edge cases', () => {
  const theme = parseTheme();
  const emptyTheme = { tokens: {}, keyframes: {}, mode: 'inline' as const, prefix: '' };

  it('resolves arbitrary, edge, and invalid numeric values without accepting unsafe fallbacks', () => {
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
    expect(resolveUtilityColor('current', theme)).toBe('currentColor');
    expect(resolveUtilityColor('inherit', theme)).toBe('inherit');
    expect(compileGradientUtility('from-red-500/none', false, theme)).toBeNull();
    expect(compileColorUtility('text-xs', theme)).toBeNull();
    expect(compileColorUtility('bg-red-500/101', theme)).toBeNull();
    expect(compileAnimationUtility('none', theme)).toEqual({ property: 'animation', value: 'none' });
    expect(compileTransformUtility('translate-x-invalid', false, theme)).toBeNull();
    expect(compileTransformUtility('scale-invalid', false, theme)).toBeNull();
    expect(compileTransformUtility('skew-x-invalid', false, theme)).toBeNull();
    expect(() => compileArbitraryProperty('[123:unsafe]')).toThrow('Invalid arbitrary CSSX utility');
  });

  it('resolves every directional box-model form and rejects invalid modifiers', () => {
    expect(compileBorderWidthUtility('border-x-2')).toEqual([
      { property: 'border-left-width', value: '2px' },
      { property: 'border-right-width', value: '2px' },
    ]);
    expect(compileBorderWidthUtility('border-z-2')).toBeNull();
    expect(compileSpacingUtility('m-auto', false, theme)).toEqual([{ property: 'margin', value: 'auto' }]);
    expect(compileSpacingUtility('inset-x-full', true, theme)).toEqual([
      { property: 'left', value: '-100%' },
      { property: 'right', value: '-100%' },
    ]);
    expect(compileSpacingUtility('p-invalid', false, theme)).toBeNull();
    expect(compileSpaceUtility('space-y-reverse', false, theme)?.[0]).toMatchObject({
      property: '--cssx-space-y-reverse',
      value: '1',
    });
    expect(compileSpaceUtility('space-x-invalid', false, theme)).toBeNull();
    expect(compileDivideUtility('divide-y', theme)).toHaveLength(3);
    expect(compileDivideUtility('divide-x-reverse', theme)?.[0]).toMatchObject({ value: '1' });
    expect(compileDivideUtility('divide-red-500/50', theme)?.[0]?.value).toContain('color-mix');
    expect(compileDivideUtility('divide-red-500/101', theme)).toBeNull();
    expect(compilePlaceholderUtility('placeholder-red-500/50', theme)?.[0]?.value).toContain('color-mix');
    expect(compilePlaceholderUtility('placeholder-red-500/101', theme)).toBeNull();
    expect(compileOutlineUtility('outline-hidden', false, theme)).toHaveLength(2);
    expect(compileOutlineUtility('outline-offset-2', true, theme)?.[0]).toEqual({
      property: 'outline-offset',
      value: '-2px',
    });
    expect(compileOutlineUtility('outline-offset-8', false, theme)?.[0]).toEqual({
      property: 'outline-offset',
      value: '8px',
    });
    expect(compileOutlineUtility('outline-offset-[3px]', true, theme)?.[0]).toEqual({
      property: 'outline-offset',
      value: '-3px',
    });
    expect(compileOutlineUtility('outline-offset-[var(--offset)]', true, theme)?.[0]).toEqual({
      property: 'outline-offset',
      value: 'calc(var(--offset) * -1)',
    });
    expect(compileOutlineUtility('outline-offset-[calc(1px+2px)]', true, theme)?.[0]).toEqual({
      property: 'outline-offset',
      value: 'calc(calc(1px+2px) * -1)',
    });
    expect(compileOutlineUtility('outline-offset-0', true, theme)?.[0]).toEqual({
      property: 'outline-offset',
      value: '0',
    });
    expect(compileOutlineUtility('outline-[3px]', false, theme)?.[0]).toEqual({
      property: 'outline-width',
      value: '3px',
    });
    expect(compileOutlineUtility('outline-red-500/50', false, theme)?.[0]?.value).toContain('color-mix');
    expect(compileOutlineUtility('outline-red-500/101', false, theme)).toBeNull();
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
    expect(compileModernUtility('contain-[layout_paint]', theme)).toEqual({
      property: 'contain',
      value: 'layout paint',
    });
    expect(compileModernUtility('contain-intrinsic-size-none', theme)).toEqual({
      property: 'contain-intrinsic-size',
      value: 'none',
    });
    expect(compileModernUtility('contain-intrinsic-inline-size-2', theme)).toEqual({
      property: 'contain-intrinsic-inline-size',
      value: 'calc(0.25rem * 2)',
    });
    expect(compileModernUtility('stroke-dasharray-[4_8]', theme)).toEqual({
      property: 'stroke-dasharray',
      value: '4 8',
    });
    expect(compileModernUtility('stroke-dasharray-invalid', theme)).toBeNull();
    expect(compileBackgroundUtility('bg-clip-text')).toHaveLength(3);
    expect(compileBackgroundUtility('bg-position-[25%_75%]')).toEqual({
      property: 'background-position',
      value: '25% 75%',
    });
    expect(compileBackgroundUtility('bg-size-[auto_100%]')).toEqual({
      property: 'background-size',
      value: 'auto 100%',
    });
    expect(compileMaskUtility('mask-position-[center]')).toEqual({ property: 'mask-position', value: 'center' });
    expect(compileMaskUtility('mask-[url("/mask.svg")]')).toEqual({
      property: 'mask-image',
      value: 'url("/mask.svg")',
    });
    expect(compileNumericUtility('normal-nums')).toHaveLength(1);
    expect(compileNumericUtility('tabular-nums')).toHaveLength(2);
  });

  it('covers paint, filter, transform, and motion value branches', () => {
    expect(compileGradientUtility('bg-linear-45', true, theme)?.[0]?.value).toContain('-45deg');
    expect(compileGradientUtility('from-50%', false, theme)?.[0]).toEqual({
      property: '--cssx-gradient-from-position',
      value: '50%',
      semanticGroup: 'gradient-from',
    });
    expect(compileGradientUtility('via-red-500/50', false, theme)).toHaveLength(2);
    expect(compileColorUtility('text-[length:12px]', theme)).toEqual({ property: 'font-size', value: '12px' });
    expect(compileColorUtility('bg-[image:url("/image.svg")]', theme)).toEqual({
      property: 'background-image',
      value: 'url("/image.svg")',
    });
    expect(compileTextDecorationUtility('underline-offset-auto', theme)).toEqual({
      property: 'text-underline-offset',
      value: 'auto',
    });
    expect(compileTextDecorationUtility('decoration-[3px]', theme)).toEqual({
      property: 'text-decoration-thickness',
      value: '3px',
    });
    expect(compileTextDecorationUtility('decoration-red-500', theme)).toEqual({
      property: 'text-decoration-color',
      value: 'oklch(63.71% 0.237 25.331)',
    });
    expect(compileFilterUtility('opacity-50', false)).toBeNull();
    expect(compileFilterUtility('hue-rotate-45', true)?.[0]?.value).toBe('hue-rotate(-45deg)');
    expect(compileFilterUtility('drop-shadow', false)).toHaveLength(2);
    expect(compileBackdropFilterUtility('backdrop-opacity-50', false)).toHaveLength(3);
    expect(compileBackdropFilterUtility('blur-sm', false)).toBeNull();
    expect(compileRingUtility('ring-offset-2', theme)).toHaveLength(3);
    expect(compileRingUtility('ring-red-500/50', theme)?.[0]?.value).toContain('color-mix');
    expect(compileTransformUtility('rotate-[15deg]', true, theme)?.[0]).toEqual({
      property: 'rotate',
      value: '-15deg',
    });
    expect(compileTransformUtility('scale-50', false, theme)).toHaveLength(3);
    expect(compileTransformUtility('skew-y-6', true, theme)?.[0]).toEqual({
      property: '--cssx-skew-y',
      value: '-6deg',
    });
    expect(isMotionUtilityCandidate('duration-100')).toBe(true);
    expect(isMotionUtilityCandidate('opacity-100')).toBe(false);
    expect(compileMotionUtility('animation-name-none', false, theme)).toEqual({
      property: 'animation-name',
      value: 'none',
    });
    expect(compileMotionUtility('animation-name-[hero]', false, theme)).toEqual({
      property: 'animation-name',
      value: 'hero',
    });
    expect(compileMotionUtility('animation-name-spin', true, theme)).toBeNull();
    expect(compileMotionUtility('animation-iterations-infinite', false, theme)).toEqual({
      property: 'animation-iteration-count',
      value: 'infinite',
    });
    expect(compileMotionUtility('animation-iterations-invalid', false, theme)).toBeNull();
    expect(compileMotionUtility('animation-direction-reverse', true, theme)).toBeNull();
    expect(compileMotionUtility('stagger-reverse', false, theme)).toEqual({
      property: '--cssx-stagger-reverse',
      value: '1',
    });
    expect(compileMotionUtility('stagger-index-[2]', false, theme)).toEqual({
      property: '--cssx-stagger-index',
      value: '2',
    });
    expect(compileMotionUtility('animation-timeline-auto', false, theme)).toMatchObject({
      atRule: expect.stringContaining('animation-timeline'),
    });
    expect(compileMotionUtility('animation-timeline-scroll-y', false, theme)).toMatchObject({ value: 'scroll(y)' });
    expect(compileMotionUtility('view-timeline-axis-x', false, theme)).toMatchObject({
      property: 'view-timeline-axis',
    });
    expect(compileMotionUtility('timeline-scope-all', false, theme)).toMatchObject({ value: 'all' });
    expect(compileMotionUtility('animation-range-end-cover', false, theme)).toMatchObject({
      property: 'animation-range-end',
    });
    expect(compileMotionUtility('view-transition-name-[inherit]', false, theme)).toBeNull();
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
      'grid-rows-3',
      'grid-rows-subgrid',
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
      'font-[Inter]',
      'tracking-widest',
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

    expect(compileDivideUtility('divide-x-invalid', theme)).toBeNull();
    expect(compileDivideUtility('divide-not-a-color', theme)).toBeNull();
    expect(compilePlaceholderUtility('placeholder-not-a-color', theme)).toBeNull();
    expect(compileOutlineUtility('outline-offset-invalid', false, theme)).toBeNull();

    expect(compileFilterUtility('hue-rotate-[.5turn]', true)?.[0]?.value).toBe('hue-rotate(.5turn)');
    expect(compileFilterUtility('hue-rotate-invalid', false)).toBeNull();
    expect(compileFilterUtility('drop-shadow-[0_1px_2px_black]', false)?.[0]?.value).toContain(
      'drop-shadow(0_1px_2px_black)',
    );
    expect(compileBackdropFilterUtility('backdrop-drop-shadow', false)).toBeNull();
    expect(compileRingUtility('ring-offset-invalid', theme)).toBeNull();
    expect(compileRingUtility('ring', theme)).toHaveLength(3);
    expect(compileRingUtility('ring-red-500/101', theme)).toBeNull();

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

    expect(
      compileModernUtility('contain-intrinsic-size-custom', {
        ...emptyTheme,
        tokens: { '--contain-intrinsic-size-custom': '24px' },
      }),
    ).toEqual({
      property: 'contain-intrinsic-size',
      value: '24px',
    });
    expect(compileModernUtility('contain-intrinsic-size-(--custom)', emptyTheme)?.value).toBe('var(--custom)');
    expect(compileModernUtility('contain-intrinsic-size-unknown', emptyTheme)).toBeNull();

    for (const utility of [
      'delay-stagger',
      'ease-in',
      'animation-delay-stagger',
      'animation-duration-100',
      'animation-ease-in',
      'animation-iterations-2',
      'animation-direction-normal',
      'animation-fill-none',
      'animation-running',
      'animation-composition-add',
      'stagger-reverse',
      'stagger-100',
      'stagger-index-2',
      'animation-timeline-auto',
      'scroll-timeline-axis-x',
      'animation-range-entry',
      'view-transition-name-none',
    ]) {
      expect(compileMotionUtility(utility, true, theme), utility).toBeNull();
    }
    expect(
      compileMotionUtility('animation-ease-only', false, {
        ...emptyTheme,
        tokens: { '--animation-ease-only': 'linear(0, 1)' },
      }),
    ).toMatchObject({ value: 'linear(0, 1)' });
    expect(compileMotionUtility('ease-invalid', false, emptyTheme)).toBeNull();
    expect(compileMotionUtility('delay-(--time)', true, theme)).toMatchObject({ value: 'calc(var(--time) * -1)' });

    expect(compileGradientUtility('bg-linear-[45deg]', false, theme)?.[0]?.value).toContain('45deg');
    expect(compileTextDecorationUtility('underline-offset-(--offset)', theme)?.value).toBe('var(--offset)');
    expect(compileTextDecorationUtility('underline-offset-2', emptyTheme)?.value).toBe('');
    expect(compileTextDecorationUtility('decoration-auto', theme)?.value).toBe('auto');
    expect(compileTextDecorationUtility('decoration-invalid', theme)).toBeNull();

    expect(compilePrefixedUtility('basis-invalid', false, theme)).toBeNull();
    expect(compilePrefixedUtility('flex-1/0', false, theme)).toBeNull();
    expect(compileDimensionUtility('w-4', false, theme)?.property).toBe('width');
    expect(compileTransformUtility('rotate-invalid', false, theme)).toBeNull();
    expect(flexValue('invalid')).toBeNull();
    expect(resolveDimensionValue('1/2', false, theme, 'w')).toBe('50%');
    expect(resolveDimensionValue('1/2', true, theme, 'w')).toBe('-50%');
  });
});
