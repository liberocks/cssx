import { describe, expect, it } from 'vitest';
import { compileUtilities } from '../src/index';

describe('CSSX utility compiler', () => {
  it('compiles borders, transition values, and transform channels without replacing sibling axes', async () => {
    const result = await compileUtilities(
      [
        'border',
        'border-red-500',
        'shadow-md',
        'transition-colors',
        'transition-normal',
        'transition-discrete',
        'duration-200',
        'translate-x-2',
        'translate-y-3',
        'scale-x-95',
        'scale-y-105',
        '-rotate-45',
        'skew-x-6',
        '-skew-y-12',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('border-width:1px');
    expect(result.css).toContain('border-color:#ef4444');
    expect(result.css).toContain('--cssx-shadow:0 4px 6px -1px');
    expect(result.css).toContain('transition-duration:200ms');
    expect(result.css).toContain('transition-behavior:normal');
    expect(result.css).toContain('transition-behavior:allow-discrete');
    expect(result.css).toContain('--cssx-translate-x:calc(0.25rem * 2)');
    expect(result.css).toContain('--cssx-translate-y:calc(0.25rem * 3)');
    expect(result.css).toContain('scale:var(--cssx-scale-x, 1) var(--cssx-scale-y, 1)');
    expect(result.css).toContain('rotate:-45deg');
    expect(result.css).toContain('--cssx-skew-x:6deg');
    expect(result.css).toContain('--cssx-skew-y:-12deg');
    expect(result.css).toContain('transform:skewX(var(--cssx-skew-x, 0deg)) skewY(var(--cssx-skew-y, 0deg))');
  });

  it('compiles the largest built-in shadow', async () => {
    const result = await compileUtilities(['shadow-2xl'], (candidate) => `x-${candidate}`);

    expect(result.css).toContain('--cssx-shadow:0 25px 50px -12px rgb(0 0 0 / .25)');
    expect(result.css).toContain(
      'box-shadow:var(--cssx-shadow, 0 0 #0000), var(--cssx-ring-offset-shadow, 0 0 #0000), var(--cssx-ring-shadow, 0 0 #0000)',
    );
  });

  it('compiles independent animation longhands, arbitrary values, and theme duration tokens', async () => {
    const result = await compileUtilities(
      [
        'animate-spin',
        'animation-duration-500',
        'animation-duration-fast',
        'animation-delay-[150ms]',
        'animation-ease-out',
        'animation-ease-[steps(4,_end)]',
        'animation-iterations-2',
        'animation-direction-alternate',
        'animation-fill-both',
        'animation-paused',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
      '@theme { --animation-duration-fast: 150ms; }',
    );

    expect(result.css).toContain('animation:spin 1s linear infinite');
    expect(result.css).toContain('animation-duration:500ms');
    expect(result.css).toContain('animation-duration:150ms');
    expect(result.css).toContain('animation-delay:150ms');
    expect(result.css).toContain('animation-timing-function:cubic-bezier(0, 0, .2, 1)');
    expect(result.css).toContain('animation-timing-function:steps(4, end)');
    expect(result.css).toContain('animation-iteration-count:2');
    expect(result.css).toContain('animation-direction:alternate');
    expect(result.css).toContain('animation-fill-mode:both');
    expect(result.css).toContain('animation-play-state:paused');
    expect(result.css.indexOf('.x-animate-spin')).toBeLessThan(result.css.indexOf('.x-animation-duration-500'));
  });

  it('compiles property-specific arbitrary typography, text, and background values', async () => {
    const result = await compileUtilities(
      [
        'font-[var(--font-display)]',
        'font-(--font-body)',
        'text-[14px]',
        'text-[#123456]',
        'bg-[url("hero image.svg")]',
        'bg-[#123456]',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('font-family:var(--font-display)');
    expect(result.css).toContain('font-family:var(--font-body)');
    expect(result.css).toContain('font-size:14px');
    expect(result.css).toContain('color:#123456');
    expect(result.css).toContain('background-image:url("hero image.svg")');
    expect(result.css).toContain('background-color:#123456');
  });

  it('compiles common background placement, repetition, attachment, clip, and origin utilities', async () => {
    const result = await compileUtilities(
      [
        'bg-cover',
        'bg-top-right',
        'bg-repeat-round',
        'bg-fixed',
        'bg-clip-text',
        'bg-origin-content',
        'bg-position-[25%_75%]',
        'bg-size-(--hero-size)',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('background-size:cover');
    expect(result.css).toContain('background-position:top right');
    expect(result.css).toContain('background-repeat:round');
    expect(result.css).toContain('background-attachment:fixed');
    expect(result.css).toContain('-webkit-background-clip:text;background-clip:text;color:transparent');
    expect(result.css).toContain('background-origin:content-box');
    expect(result.css).toContain('background-position:25% 75%');
    expect(result.css).toContain('background-size:var(--hero-size)');
  });

  it('compiles mask image, size, repeat, clip, origin, and arbitrary placement utilities', async () => {
    const result = await compileUtilities(
      [
        'mask-none',
        'mask-[url("/scribble.svg")]',
        'mask-cover',
        'mask-repeat-x',
        'mask-clip-content',
        'mask-origin-padding',
        'mask-position-[25%_75%]',
        'mask-size-(--mask-size)',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );
    expect(result.css).toContain('mask-image:none');
    expect(result.css).toContain('mask-image:url("/scribble.svg")');
    expect(result.css).toContain('mask-size:cover');
    expect(result.css).toContain('mask-repeat:repeat-x');
    expect(result.css).toContain('mask-clip:content-box');
    expect(result.css).toContain('mask-origin:padding-box');
    expect(result.css).toContain('mask-position:25% 75%');
    expect(result.css).toContain('mask-size:var(--mask-size)');
  });

  it('supports numeric slash opacity modifiers for color utilities', async () => {
    const result = await compileUtilities(
      ['bg-red-500/50', 'text-white/[37.5]', 'border-blue-600/0'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('background-color:color-mix(in srgb, #ef4444 50%, transparent)');
    expect(result.css).toContain('color:color-mix(in srgb, #fff 37.5%, transparent)');
    expect(result.css).toContain('border-color:color-mix(in srgb, #2563eb 0%, transparent)');
  });

  it('compiles linear gradients, color stops, opacity, and stop positions', async () => {
    const result = await compileUtilities(
      ['bg-linear-to-r/oklch', 'from-red-500/50', 'from-10%', 'via-blue-500', 'via-[45%]', 'to-transparent', 'to-90%'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain(
      'background-image:linear-gradient(in oklch to right, var(--cssx-gradient-via-stops, var(--cssx-gradient-stops)))',
    );
    expect(result.css).toContain('--cssx-gradient-from:color-mix(in srgb, #ef4444 50%, transparent)');
    expect(result.css).toContain('--cssx-gradient-from-position:10%');
    expect(result.css).toContain('--cssx-gradient-via:#3b82f6');
    expect(result.css).toContain('--cssx-gradient-via-position:45%');
    expect(result.css).toContain('--cssx-gradient-to:transparent');
    expect(result.css).toContain('--cssx-gradient-to-position:90%');
  });

  it('composes rings, ring colors and offsets with regular shadows', async () => {
    const result = await compileUtilities(
      ['shadow-sm', 'ring-2', 'ring-blue-500/50', 'ring-offset-2', 'ring-offset-white'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('--cssx-shadow:0 1px 2px 0 rgb(0 0 0 / .05)');
    expect(result.css).toContain('--cssx-ring-width:2px');
    expect(result.css).toContain('--cssx-ring-color:color-mix(in srgb, #3b82f6 50%, transparent)');
    expect(result.css).toContain('--cssx-ring-offset-width:2px');
    expect(result.css).toContain('--cssx-ring-offset-color:#fff');
    expect(result.css).toContain(
      'box-shadow:var(--cssx-shadow, 0 0 #0000), var(--cssx-ring-offset-shadow, 0 0 #0000), var(--cssx-ring-shadow, 0 0 #0000)',
    );
  });

  it('composes documented CSS filter channels without a legacy filter utility', async () => {
    const result = await compileUtilities(
      ['blur-sm', 'brightness-125', 'grayscale', '-hue-rotate-45', 'drop-shadow-lg'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

