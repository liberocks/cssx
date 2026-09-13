import { describe, expect, it } from 'vitest';

import { parseTheme } from './theme';
import { compilePrefixedUtility } from './utility-prefixed';

describe('compilePrefixedUtility', () => {
  const theme = parseTheme();
  const emptyTheme = { tokens: {}, keyframes: {}, mode: 'inline' as const, prefix: '' };

  it('routes supported candidates to their declaration compilers', () => {
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
      const utility = negative ? candidate.slice(1) : candidate;
      expect(compilePrefixedUtility(utility, negative, theme), candidate).not.toBeNull();
    }
  });

  it('rejects unsupported candidates and alternatives that need missing theme values', () => {
    expect(compilePrefixedUtility('leading-6', false, emptyTheme)).toBeNull();
    expect(compilePrefixedUtility('indent-invalid', false, theme)).toBeNull();
    for (const candidate of [
      'duration-unknown',
      'columns-invalid',
      'grid-cols-invalid',
      'animation-range-invalid',
      'basis-invalid',
      'flex-1/0',
      'unsupported-utility',
    ]) {
      expect(compilePrefixedUtility(candidate, false, theme), candidate).toBeNull();
    }
  });
});
