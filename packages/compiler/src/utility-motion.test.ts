import { describe, expect, it } from 'vitest';
import { compileStyleRecords, compileUtilities } from '../src/index';

const className = (candidate: string) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`;

describe('CSSX motion utilities', () => {
  it('provides semantic duration, spring, stagger, and animation presets', async () => {
    const result = await compileUtilities(
      [
        'duration-normal',
        'ease-spring-snappy',
        'stagger-tight',
        'animate-fade-in',
        'animation-name-shimmer',
        '[animation:scale-in_200ms_both]',
      ],
      className,
    );

    expect(result.css).toContain('transition-duration:200ms');
    expect(result.css).toContain('transition-timing-function:linear(');
    expect(result.css).toContain('--cssx-stagger:40ms');
    expect(result.css).toContain('animation:fade-in 200ms cubic-bezier(0, 0, .2, 1) both');
    expect(result.css).toContain('animation-name:shimmer');
    expect(result.css).toContain('@keyframes fade-in');
    expect(result.css).toContain('@keyframes scale-in');
    expect(result.css).toContain('@keyframes shimmer');
  });

  it('compiles transition recipes, shared time tokens, arbitrary values, and negative delays', async () => {
    const result = await compileUtilities(
      [
        'transition-transform-opacity',
        'transition-filter',
        'transition-size',
        'transition-[opacity,_display]',
        'duration-snappy',
        'duration-(--motion-duration)',
        '-delay-75',
        'delay-late',
        'ease-expressive',
      ],
      className,
      '@theme { --duration-snappy: 180ms; --delay-late: 90ms; --ease-expressive: linear(0, 1); }',
    );

    expect(result.css).toContain('transition-property:transform, translate, scale, rotate, opacity');
    expect(result.css).toContain('transition-property:filter, -webkit-backdrop-filter, backdrop-filter');
    expect(result.css).toContain('transition-property:width, height, inline-size, block-size');
    expect(result.css).toContain('transition-property:opacity, display');
    expect(result.css).toContain('transition-duration:180ms');
    expect(result.css).toContain('transition-duration:var(--motion-duration)');
    expect(result.css).toContain('transition-delay:-75ms');
    expect(result.css).toContain('transition-delay:90ms');
    expect(result.css).toContain('transition-timing-function:linear(0, 1)');
  });

  it('compiles animation longhands and emits keyframes requested by animation-name', async () => {
    const result = await compileUtilities(
      [
        'animation-name-reveal',
        'animation-duration-auto',
        'animation-duration-gentle',
        '-animation-delay-120',
        'animation-ease-expressive',
        'animation-iterations-[2.5]',
        'animation-composition-add',
      ],
      className,
      '@theme { --animation-duration-gentle: 700ms; --ease-expressive: steps(3, end); @keyframes reveal { from { opacity: 0; } to { opacity: 1; } } }',
    );

    expect(result.css).toContain('animation-name:reveal');
    expect(result.css).toContain('animation-duration:auto');
    expect(result.css).toContain('animation-duration:700ms');
    expect(result.css).toContain('animation-delay:-120ms');
    expect(result.css).toContain('animation-timing-function:steps(3, end)');
    expect(result.css).toContain('animation-iteration-count:2.5');
    expect(result.css).toContain('animation-composition:add');
    expect(result.css).toContain('@keyframes reveal{ from { opacity: 0; } to { opacity: 1; } }');
  });

  it('retains and rewrites keyframes referenced through reference theme animation tokens', async () => {
    const result = await compileUtilities(
      ['animate-reveal'],
      className,
      '@theme prefix(app) { --animate-reveal: reveal 200ms both; --motion-offset: 1rem; @keyframes reveal { from { translate: 0 var(--motion-offset); } } }',
    );

    expect(result.css).toContain('--app-animate-reveal:reveal 200ms both');
    expect(result.css).toContain('--app-motion-offset:1rem');
    expect(result.css).toContain('@keyframes reveal{ from { translate: 0 var(--app-motion-offset); } }');
    expect(result.css).toContain('animation:var(--app-animate-reveal)');
  });

  it('retains keyframes referenced through unprefixed animation tokens', async () => {
    const result = await compileUtilities(
      ['[animation:var(--animate-reveal)]'],
      className,
      '@theme { --animate-reveal: reveal 200ms both; @keyframes reveal { to { opacity: 1; } } }',
    );

    expect(result.css).toContain('animation:var(--animate-reveal)');
    expect(result.css).toContain('@keyframes reveal{ to { opacity: 1; } }');
  });

  it('compiles declarative stagger formulas without runtime coordination', async () => {
    const result = await compileUtilities(
      [
        'stagger-quick',
        'stagger-index-2',
        'stagger-count-[5]',
        'stagger-reverse',
        'delay-stagger',
        'animation-delay-stagger',
      ],
      className,
      '@theme { --stagger-quick: 45ms; }',
    );

    expect(result.css).toContain('--cssx-stagger:45ms');
    expect(result.css).toContain('--cssx-stagger-index:2');
    expect(result.css).toContain('--cssx-stagger-count:5');
    expect(result.css).toContain('--cssx-stagger-reverse:1');
    expect(result.css).toContain('transition-delay:calc((var(--cssx-stagger-index, 0)');
    expect(result.css).toContain('animation-delay:calc((var(--cssx-stagger-index, 0)');
  });

  it('gates scroll timelines and animation ranges behind native feature queries', async () => {
    const result = await compileUtilities(
      [
        'animation-timeline-scroll-root-block',
        'animation-timeline-view-inline',
        'animation-timeline-[--reading]',
        'scroll-timeline-name-[--reading]',
        'scroll-timeline-axis-y',
        'view-timeline-inset-[10%_20%]',
        'timeline-scope-[--reading]',
        'animation-range-entry',
        'animation-range-start-[entry_20%]',
      ],
      className,
    );

    expect(result.css).toContain('@supports (animation-timeline: scroll())');
    expect(result.css).toContain('animation-timeline:scroll(root block)');
    expect(result.css).toContain('animation-timeline:view(inline)');
    expect(result.css).toContain('animation-timeline:--reading');
    expect(result.css).toContain('@supports (scroll-timeline-name: none)');
    expect(result.css).toContain('scroll-timeline-name:--reading');
    expect(result.css).toContain('scroll-timeline-axis:y');
    expect(result.css).toContain('@supports (view-timeline-name: none)');
    expect(result.css).toContain('view-timeline-inset:10% 20%');
    expect(result.css).toContain('@supports (timeline-scope: none)');
    expect(result.css).toContain('timeline-scope:--reading');
    expect(result.css).toContain('@supports (animation-range: normal)');
    expect(result.css).toContain('animation-range:entry');
    expect(result.css).toContain('animation-range-start:entry 20%');
  });

  it('compiles validated View Transition names and classes behind feature queries', async () => {
    const result = await compileUtilities(
      [
        'view-transition-name-none',
        'view-transition-name-match',
        'view-transition-name-[hero-card]',
        'view-transition-class-none',
        'view-transition-class-[card_shared]',
      ],
      className,
    );

    expect(result.css).toContain('@supports (view-transition-name: none)');
    expect(result.css).toContain('@supports (view-transition-name: match-element)');
    expect(result.css).toContain('view-transition-name:hero-card');
    expect(result.css).toContain('@supports (view-transition-class: none)');
    expect(result.css).toContain('view-transition-class:card shared');
  });

  it('applies reduced-motion, starting-style, and View Transition pseudo-element variants', async () => {
    const result = await compileUtilities(
      [
        'motion-safe:animate-spin',
        'motion-reduce:duration-0',
        'starting:opacity-0',
        'vt-group-[*]:opacity-0',
        'vt-new-[.shared-card]:opacity-0',
        'vt-old-[hero-card]:opacity-0',
      ],
      className,
    );

    expect(result.css).toContain('@media (prefers-reduced-motion: no-preference)');
    expect(result.css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(result.css).toContain('@starting-style{.x-starting-opacity-0{opacity:0;}}');
    expect(result.css).toContain('::view-transition-group(*){opacity:0;}');
    expect(result.css).toContain('::view-transition-new(.shared-card){opacity:0;}');
    expect(result.css).toContain('::view-transition-old(hero-card){opacity:0;}');
    expect(result.css).toContain('@supports (view-transition-name: none)');
  });

  it('emits state-matched starting styles after resting rules', async () => {
    const result = await compileUtilities(['open:opacity-100', 'open:starting:opacity-0'], className);
    const restingRule = '.x-open-opacity-100:open{opacity:1;}';
    const startingRule = '@starting-style{.x-open-starting-opacity-0:open{opacity:0;}}';

    expect(result.css).toContain(restingRule);
    expect(result.css).toContain(startingRule);
    expect(result.css.indexOf(restingRule)).toBeLessThan(result.css.indexOf(startingRule));
  });

  it('rejects invalid motion values and reserved View Transition identifiers', () => {
    for (const candidate of [
      'duration-someday',
      '-duration-100',
      'animation-name-missing',
      'animation-timeline-[reading]',
      'view-transition-name-[inherit]',
      'view-transition-class-[none_shared]',
    ]) {
      expect(() => compileStyleRecords({ root: candidate }), candidate).toThrow();
    }
  });

  it('rejects incompatible terminal View Transition variant combinations', async () => {
    await expect(compileUtilities(['before:vt-old-[hero]:opacity-0'], className)).rejects.toThrow(
      'cannot compose with relationship or pseudo-element variants',
    );
    await expect(compileUtilities(['group-hover:vt-new-[hero]:opacity-100'], className)).rejects.toThrow(
      'cannot compose with relationship or pseudo-element variants',
    );
  });
});
