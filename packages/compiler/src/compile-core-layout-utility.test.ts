import { describe, expect, it } from 'vitest';

import { compileCoreLayoutUtility } from './compile-core-layout-utility';
import { parseTheme } from './theme';

describe('compileCoreLayoutUtility', () => {
  const theme = parseTheme();

  it('compiles exact, overflow, overscroll, aspect, and sizing utilities', () => {
    expect(compileCoreLayoutUtility('isolate', false, theme)).toEqual({ property: 'isolation', value: 'isolate' });
    expect(compileCoreLayoutUtility('overflow-x-scroll', false, theme)).toEqual({
      property: 'overflow-x',
      value: 'scroll',
    });
    expect(compileCoreLayoutUtility('overscroll-y-contain', false, theme)).toEqual({
      property: 'overscroll-behavior-y',
      value: 'contain',
    });
    expect(compileCoreLayoutUtility('overscroll-contain', false, theme)).toEqual({
      property: 'overscroll-behavior',
      value: 'contain',
    });
    expect(compileCoreLayoutUtility('aspect-[4/3]', false, theme)).toEqual({ property: 'aspect-ratio', value: '4/3' });
    expect(compileCoreLayoutUtility('size-4', false, theme)).toEqual([
      { property: 'width', value: 'calc(0.25rem * 4)' },
      { property: 'height', value: 'calc(0.25rem * 4)' },
    ]);
    expect(compileCoreLayoutUtility('size-invalid', false, theme)).toBeNull();
  });

  it('compiles logical insets, interaction, grid-flow, and auto-track utilities', () => {
    expect(compileCoreLayoutUtility('start-2', false, theme)).toEqual({
      property: 'inset-inline-start',
      value: 'calc(0.25rem * 2)',
    });
    expect(compileCoreLayoutUtility('end-2', false, theme)).toMatchObject({ property: 'inset-inline-end' });
    expect(compileCoreLayoutUtility('end-invalid', false, theme)).toBeNull();
    expect(compileCoreLayoutUtility('cursor-grab', false, theme)).toEqual({ property: 'cursor', value: 'grab' });
    expect(compileCoreLayoutUtility('will-change-transform', false, theme)).toEqual({
      property: 'will-change',
      value: 'transform',
    });
    expect(compileCoreLayoutUtility('grid-flow-col-dense', false, theme)).toEqual({
      property: 'grid-auto-flow',
      value: 'col dense',
    });
    expect(compileCoreLayoutUtility('auto-cols-fr', false, theme)).toEqual({
      property: 'grid-auto-columns',
      value: 'minmax(0, 1fr)',
    });
    expect(compileCoreLayoutUtility('auto-rows-min', false, theme)).toEqual({
      property: 'grid-auto-rows',
      value: 'min-content',
    });
  });

  it('compiles scroll spacing, SVG widths, and opacity-modified scrollbar colors', () => {
    expect(compileCoreLayoutUtility('scroll-px-2', false, theme)).toEqual([
      { property: 'scroll-padding-left', value: 'calc(0.25rem * 2)' },
      { property: 'scroll-padding-right', value: 'calc(0.25rem * 2)' },
    ]);
    expect(compileCoreLayoutUtility('scroll-pt-2', true, theme)).toEqual([
      { property: 'scroll-padding-top', value: 'calc(0.25rem * -2)' },
    ]);
    expect(compileCoreLayoutUtility('scroll-px-invalid', false, theme)).toBeNull();
    expect(compileCoreLayoutUtility('stroke-3', false, theme)).toEqual({ property: 'stroke-width', value: '3' });
    expect(compileCoreLayoutUtility('stroke-[3px]', false, theme)).toEqual({ property: 'stroke-width', value: '3px' });
    expect(compileCoreLayoutUtility('scrollbar-thumb-red-500/50', false, theme)).toHaveLength(2);
    expect(compileCoreLayoutUtility('scrollbar-track-red-500', false, theme)).toHaveLength(2);
    expect(compileCoreLayoutUtility('scrollbar-thumb-invalid', false, theme)).toBeNull();
    expect(compileCoreLayoutUtility('scrollbar-track-red-500/101', false, theme)).toBeNull();
  });

  it('returns null for candidates outside the layout compiler', () => {
    expect(compileCoreLayoutUtility('not-a-layout-utility', false, theme)).toBeNull();
  });
});
