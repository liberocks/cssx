import { describe, expect, it } from 'vitest';
import { compileUtilities } from '../src/index';

describe('CSSX utility compiler', () => {
  it('compiles flex and grid alignment/distribution utilities', async () => {
    const result = await compileUtilities(
      [
        'items-baseline',
        'self-end',
        'justify-items-center',
        'justify-self-stretch',
        'place-items-baseline',
        'place-self-auto',
        'place-content-evenly',
      ],
      (candidate) => `x-${candidate}`,
    );

    expect(result.css).toContain('align-items:baseline');
    expect(result.css).toContain('align-self:flex-end');
    expect(result.css).toContain('justify-items:center');
    expect(result.css).toContain('justify-self:stretch');
    expect(result.css).toContain('place-items:baseline');
    expect(result.css).toContain('place-self:auto');
    expect(result.css).toContain('place-content:space-evenly');
  });

  it('compiles child-spacing utilities as one nested selector rule and preserves variant placement', async () => {
    const result = await compileUtilities(
      ['space-x-4', 'space-y-2', 'hover:space-x-4'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.classes['space-x-4']?.split(' ')).toHaveLength(1);
    expect(result.css).toContain(
      '.x-space-x-4 > :not(:last-child){--cssx-space-x-reverse:0;margin-left:calc(calc(0.25rem * 4) * calc(1 - var(--cssx-space-x-reverse)));margin-right:calc(calc(0.25rem * 4) * var(--cssx-space-x-reverse));}',
    );
    expect(result.css).toContain(
      '.x-space-y-2 > :not(:last-child){--cssx-space-y-reverse:0;margin-top:calc(calc(0.25rem * 2) * calc(1 - var(--cssx-space-y-reverse)));margin-bottom:calc(calc(0.25rem * 2) * var(--cssx-space-y-reverse));}',
    );
    expect(result.css).toContain('.x-hover-space-x-4:hover > :not(:last-child)');
  });

  it('compiles divider widths, reversal, and colors against child selectors', async () => {
    const result = await compileUtilities(
      ['divide-x-2', 'divide-y-reverse', 'divide-red-500/50'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.classes['divide-x-2']?.split(' ')).toHaveLength(1);
    expect(result.css).toContain(
      '.x-divide-x-2 > :not(:last-child){--cssx-divide-x-reverse:0;border-left-width:calc(2px * calc(1 - var(--cssx-divide-x-reverse)));border-right-width:calc(2px * var(--cssx-divide-x-reverse));}',
    );
    expect(result.css).toContain('.x-divide-y-reverse > :not(:last-child){--cssx-divide-y-reverse:1;}');
    expect(result.css).toContain(
      '.x-divide-red-500-50 > :not(:last-child){border-color:color-mix(in srgb, #ef4444 50%, transparent);}',
    );
  });

  it('compiles placeholder colors as pseudo-element-scoped declarations', async () => {
    const result = await compileUtilities(
      ['placeholder-slate-500/75', 'focus:placeholder-red-500'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain(
      '.x-placeholder-slate-500-75::placeholder{color:color-mix(in srgb, oklch(55.42% 0.046 257.417) 75%, transparent);}',
    );
    expect(result.css).toContain('.x-focus-placeholder-red-500:focus::placeholder{color:#ef4444;}');
  });

  it('compiles outline width, style, offset, and colors as independent declarations', async () => {
    const result = await compileUtilities(
      ['outline-2', 'outline-dashed', 'outline-offset-2', 'outline-blue-500/50', 'focus:outline-hidden'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('.x-outline-2{outline-width:2px;}');
    expect(result.css).toContain('.x-outline-dashed{outline-style:dashed;}');
    expect(result.css).toContain('.x-outline-offset-2{outline-offset:calc(0.25rem * 2);}');
    expect(result.css).toContain('.x-outline-blue-500-50{outline-color:color-mix(in srgb, #3b82f6 50%, transparent);}');
    expect(result.css).toContain('.x-focus-outline-hidden:focus{outline:2px solid transparent;outline-offset:2px;}');
  });

  it('compiles logical spacing and inset utilities without lowering them to physical sides', async () => {
    const result = await compileUtilities(
      ['px-4', 'ps-4', '-me-2', 'inset-s-1/2', 'inset-e-4'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('.x-px-4{padding-left:calc(0.25rem * 4);padding-right:calc(0.25rem * 4);}');
    expect(result.css).toContain('.x-ps-4{padding-inline-start:calc(0.25rem * 4);}');
    expect(result.css).toContain('.x--me-2{margin-inline-end:-calc(0.25rem * 2);}');
    expect(result.css).toContain('.x-inset-s-1-2{inset-inline-start:50%;}');
    expect(result.css).toContain('.x-inset-e-4{inset-inline-end:calc(0.25rem * 4);}');
  });

  it('compiles declared layout, fit, interaction, and logical position utility families', async () => {
    const result = await compileUtilities(
      [
        'overflow-x-scroll',
        'overscroll-y-contain',
        'object-cover',
        'isolate',
        'aspect-video',
        'aspect-[4/3]',
        'size-4',
        'start-1/2',
        'end-4',
        'cursor-grab',
        'touch-pan-x',
        'will-change-transform',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('overflow-x:scroll');
    expect(result.css).toContain('overscroll-behavior-y:contain');
    expect(result.css).toContain('object-fit:cover');
    expect(result.css).toContain('isolation:isolate');
    expect(result.css).toContain('aspect-ratio:16 / 9');
    expect(result.css).toContain('aspect-ratio:4/3');
    expect(result.css).toContain('width:calc(0.25rem * 4);height:calc(0.25rem * 4)');
    expect(result.css).toContain('inset-inline-start:50%');
    expect(result.css).toContain('inset-inline-end:calc(0.25rem * 4)');
    expect(result.css).toContain('cursor:grab');
    expect(result.css).toContain('touch-action:pan-x');
    expect(result.css).toContain('will-change:transform');
  });

  it('compiles content visibility, containment, and intrinsic-size utilities', async () => {
    const result = await compileUtilities(
      [
        'content-visibility-auto',
        'content-visibility-hidden',
        'contain-content',
        'contain-[layout_paint]',
        'contain-intrinsic-size-[auto_800px]',
        'contain-intrinsic-inline-size-[300px]',
        'contain-intrinsic-block-size-4',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('content-visibility:auto');
    expect(result.css).toContain('content-visibility:hidden');
    expect(result.css).toContain('contain:content');
    expect(result.css).toContain('contain:layout paint');
    expect(result.css).toContain('contain-intrinsic-size:auto 800px');
    expect(result.css).toContain('contain-intrinsic-inline-size:300px');
    expect(result.css).toContain('contain-intrinsic-block-size:calc(0.25rem * 4)');
  });

  it('compiles grid auto-flow/tracks and scroll margin/padding utilities', async () => {
    const result = await compileUtilities(
      ['grid-flow-col-dense', 'auto-cols-fr', 'auto-rows-max', 'scroll-mx-4', '-scroll-pt-2', 'scroll-p-1'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('grid-auto-flow:col dense');
    expect(result.css).toContain('grid-auto-columns:minmax(0, 1fr)');
    expect(result.css).toContain('grid-auto-rows:max-content');
    expect(result.css).toContain('scroll-margin-left:calc(0.25rem * 4);scroll-margin-right:calc(0.25rem * 4)');
    expect(result.css).toContain('scroll-padding-top:-calc(0.25rem * 2)');
    expect(result.css).toContain('scroll-padding:calc(0.25rem * 1)');
  });

  it('compiles form, scrolling, SVG, and forced-color utility families', async () => {
    const result = await compileUtilities(
      [
        'accent-blue-500',
        'appearance-none',
        'caret-red-500',
        'scheme-only-dark',
        'field-sizing-content',
        'resize-x',
        'scroll-smooth',
        'scrollbar-gutter-both',
        'scrollbar-thin',
        'scrollbar-thumb-red-500',
        'scrollbar-track-blue-500/50',
        'snap-x',
        'snap-mandatory',
        'snap-normal',
        'snap-always',
        'snap-center',
        'fill-green-500',
        'stroke-blue-500',
        'stroke-[3px]',
        'forced-color-adjust-none',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('accent-color:#3b82f6');
    expect(result.css).toContain('appearance:none');
    expect(result.css).toContain('caret-color:#ef4444');
    expect(result.css).toContain('color-scheme:only dark');
    expect(result.css).toContain('field-sizing:content');
    expect(result.css).toContain('resize:horizontal');
    expect(result.css).toContain('scroll-behavior:smooth');
    expect(result.css).toContain('scrollbar-gutter:stable both-edges');
    expect(result.css).toContain('scrollbar-width:thin');
    expect(result.css).toContain('--cssx-scrollbar-thumb:#ef4444');
    expect(result.css).toContain('--cssx-scrollbar-track:color-mix(in srgb, #3b82f6 50%, transparent)');
    expect(result.css).toContain(
      'scrollbar-color:var(--cssx-scrollbar-thumb, #0000) var(--cssx-scrollbar-track, #0000)',
    );
