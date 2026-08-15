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

    expect(result.css).toContain('--cssx-filter-blur:blur(8px)');
    expect(result.css).toContain('--cssx-filter-brightness:brightness(1.25)');
    expect(result.css).toContain('--cssx-filter-grayscale:grayscale(1)');
    expect(result.css).toContain('--cssx-filter-hue-rotate:hue-rotate(-45deg)');
    expect(result.css).toContain('--cssx-filter-drop-shadow:drop-shadow(0 4px 4px rgb(0 0 0 / .15))');
    expect(result.css).toContain('filter:var(--cssx-filter-blur,) var(--cssx-filter-brightness,)');
  });

  it('composes backdrop filters, including opacity and WebKit output', async () => {
    const result = await compileUtilities(
      ['backdrop-blur-xs', 'backdrop-brightness-50', 'backdrop-opacity-75', '-backdrop-hue-rotate-45'],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('--cssx-backdrop-blur:blur(4px)');
    expect(result.css).toContain('--cssx-backdrop-brightness:brightness(.5)');
    expect(result.css).toContain('--cssx-backdrop-opacity:opacity(.75)');
    expect(result.css).toContain('--cssx-backdrop-hue-rotate:hue-rotate(-45deg)');
    expect(result.css).toContain('-webkit-backdrop-filter:var(--cssx-backdrop-blur,)');
    expect(result.css).toContain('backdrop-filter:var(--cssx-backdrop-blur,)');
  });

  it('compiles documented color families across backgrounds, text, and borders', async () => {
    const result = await compileUtilities(
      ['bg-orange-500', 'text-mauve-950', 'border-mist-200'],
      (candidate) => `x-${candidate}`,
    );

    expect(result.css).toContain('background-color:oklch(70.49% 0.213 47.604)');
    expect(result.css).toContain('color:oklch(14.53% 0.008 326)');
    expect(result.css).toContain('border-color:oklch(92.49% 0.005 214.3)');

    const addedFamilies = await compileUtilities(
      ['bg-deep-orange-500', 'text-blue-gray-950', 'border-light-green-200'],
      (candidate) => `x-${candidate}`,
    );

    expect(addedFamilies.css).toContain('background-color:oklch(67.93% 0.213 36.532)');
    expect(addedFamilies.css).toContain('color:oklch(23.03% 0.014 229.775)');
    expect(addedFamilies.css).toContain('border-color:oklch(87.45% 0.085 128.378)');
  });

  it('compiles default font stacks and font smoothing controls', async () => {
    const result = await compileUtilities(
      ['font-sans', 'font-serif', 'font-mono', 'antialiased', 'subpixel-antialiased'],
      (candidate) => `x-${candidate}`,
    );

    expect(result.css).toContain('font-family:ui-sans-serif, system-ui, sans-serif');
    expect(result.css).toContain('font-family:ui-serif, Georgia, Cambria');
    expect(result.css).toContain('font-family:ui-monospace, SFMono-Regular, Menlo');
    expect(result.css).toContain(
      '.x-antialiased{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}',
    );
    expect(result.css).toContain('.x-subpixel-antialiased{-webkit-font-smoothing:auto;-moz-osx-font-smoothing:auto;}');
  });

  it('compiles image and advanced font rendering controls', async () => {
    const result = await compileUtilities(
      [
        'image-render-pixelated',
        'image-render-crisp-edges',
        'font-optical-auto',
        'font-kerning-none',
        'font-synthesis-small-caps',
      ],
      (candidate) => `x-${candidate}`,
    );

    expect(result.css).toContain('image-rendering:pixelated');
    expect(result.css).toContain('image-rendering:crisp-edges');
    expect(result.css).toContain('font-optical-sizing:auto');
    expect(result.css).toContain('font-kerning:none');
    expect(result.css).toContain('font-synthesis:small-caps');
  });

  it('composes numeric font variants', async () => {
    const result = await compileUtilities(
      ['slashed-zero', 'tabular-nums', 'normal-nums'],
      (candidate) => `x-${candidate}`,
    );

    expect(result.css).toContain('--cssx-numeric-slashed-zero:slashed-zero');
    expect(result.css).toContain('--cssx-numeric-tabular-nums:tabular-nums');
    expect(result.css).toContain('font-variant-numeric:var(--cssx-numeric-ordinal,)');
    expect(result.css).toContain('.x-normal-nums{font-variant-numeric:normal;}');
  });

  it('supports common layout dimensions and automatic horizontal margins', async () => {
    const result = await compileUtilities(['mx-auto', 'max-w-4xl', 'min-h-screen'], (candidate) => `x-${candidate}`);
    expect(result.css).toContain('margin-left:auto');
    expect(result.css).toContain('margin-right:auto');
    expect(result.css).toContain('max-width:56rem');
    expect(result.css).toContain('min-height:100vh');
  });

  it('compiles the responsive container utility from the active breakpoint theme', async () => {
    const result = await compileUtilities(['container'], () => 'x-container');

    expect(result.classes.container).toBe('x-container');
    expect(result.css).toContain('.x-container{width:100%;}');
    expect(result.css).toContain('@media (width >= 40rem){.x-container{max-width:40rem;}}');
    expect(result.css).toContain('@media (width >= 96rem){.x-container{max-width:96rem;}}');
  });

  it('compiles flex and grid sizing, span, line, and ordering utilities', async () => {
    const result = await compileUtilities(
      [
        'grow',
        'shrink-0',
        'basis-1/2',
        '-order-2',
        'grid-rows-3',
        'grid-cols-subgrid',
        'col-span-full',
        'row-span-2',
        'col-start-3',
        'row-end-auto',
      ],
      (candidate) => `x-${candidate.replaceAll(/[^a-z0-9]/gi, '-')}`,
    );

    expect(result.css).toContain('flex-grow:1');
    expect(result.css).toContain('flex-shrink:0');
    expect(result.css).toContain('flex-basis:');
    expect(result.css).toContain('order:-2');
    expect(result.css).toContain('grid-template-rows:repeat(3, minmax(0, 1fr))');
    expect(result.css).toContain('grid-template-columns:subgrid');
    expect(result.css).toContain('grid-column:1 / -1');
    expect(result.css).toContain('grid-row:span 2 / span 2');
    expect(result.css).toContain('grid-column-start:3');
    expect(result.css).toContain('grid-row-end:auto');
  });
});
