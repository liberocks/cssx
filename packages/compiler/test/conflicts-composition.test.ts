import { describe, expect, it } from 'vitest';
import { compileStyleRecords, mergeCompiledStyles } from '../src/index';

describe('CSSX semantic conflict classifier', () => {
  it('composes regular shadows, ring widths, ring colors, and offsets independently', () => {
    const result = compileStyleRecords({
      shadow: 'shadow-sm',
      ring: 'ring-2 ring-blue-500',
      offset: 'ring-offset-2 ring-offset-white',
      wider: 'ring-4',
    });
    const shadow = result.styles.shadow;
    const ring = result.styles.ring;
    const offset = result.styles.offset;
    const wider = result.styles.wider;
    if (!shadow || !ring || !offset || !wider) {
      throw new Error('Expected compiled ring styles.');
    }

    expect(mergeCompiledStyles([shadow, ring, offset, wider])).toBe(
      `${result.classes['shadow-sm']} ${result.classes['ring-blue-500']} ${result.classes['ring-offset-2']} ${result.classes['ring-offset-white']} ${result.classes['ring-4']}`,
    );
  });

  it('replaces only matching filter channels and lets filter-none reset all channels', () => {
    const result = compileStyleRecords({
      soft: 'blur-sm brightness-125',
      sharp: 'blur-none contrast-125',
      none: 'filter-none',
    });
    const soft = result.styles.soft;
    const sharp = result.styles.sharp;
    const none = result.styles.none;
    if (!soft || !sharp || !none) {
      throw new Error('Expected compiled filter styles.');
    }

    expect(mergeCompiledStyles([soft, sharp])).toBe(
      `${result.classes['brightness-125']} ${result.classes['blur-none']} ${result.classes['contrast-125']}`,
    );
    expect(mergeCompiledStyles([soft, sharp, none])).toBe(result.classes['filter-none']);
  });

  it('composes backdrop channels separately and lets backdrop-filter-none reset them', () => {
    const result = compileStyleRecords({
      frost: 'backdrop-blur-sm backdrop-opacity-75',
      sharp: 'backdrop-blur-none backdrop-contrast-125',
      none: 'backdrop-filter-none',
    });
    const frost = result.styles.frost;
    const sharp = result.styles.sharp;
    const none = result.styles.none;
    if (!frost || !sharp || !none) {
      throw new Error('Expected compiled backdrop filter styles.');
    }

    expect(mergeCompiledStyles([frost, sharp])).toBe(
      `${result.classes['backdrop-opacity-75']} ${result.classes['backdrop-blur-none']} ${result.classes['backdrop-contrast-125']}`,
    );
    expect(mergeCompiledStyles([frost, sharp, none])).toBe(result.classes['backdrop-filter-none']);
  });

  it('keeps skew axes independently writable during dynamic composition', () => {
    const result = compileStyleRecords({ x: 'skew-x-6', y: '-skew-y-12', replacement: 'skew-x-3' });
    const x = result.styles.x;
    const y = result.styles.y;
    const replacement = result.styles.replacement;
    if (!x || !y || !replacement) {
      throw new Error('Expected compiled skew styles.');
    }

    expect(mergeCompiledStyles([x, y, replacement])).toBe(
      `${result.classes['-skew-y-12']} ${result.classes['skew-x-3']}`,
    );
  });

  it('keeps the responsive container as one composable utility atom', () => {
    const result = compileStyleRecords({ shell: 'container', override: 'w-full' });
    const shell = result.styles.shell;
    const override = result.styles.override;
    const containerClass = result.classes.container;
    if (!shell || !override || !containerClass) {
      throw new Error('Expected compiled container styles.');
    }

    expect(containerClass.split(' ')).toHaveLength(1);
    expect(mergeCompiledStyles([shell, override])).toBe(`${containerClass} ${result.classes['w-full']}`);
  });

  it('applies shorthand reset semantics to component longhands in both merge directions', () => {
    const result = compileStyleRecords({
      font: '[font:inherit]',
      text: 'text-sm',
      background: '[background:red]',
      color: 'bg-blue-500',
      transition: '[transition:all_1s]',
      duration: 'duration-200',
    });
    const font = result.styles.font;
    const text = result.styles.text;
    const background = result.styles.background;
    const color = result.styles.color;
    const transition = result.styles.transition;
    const duration = result.styles.duration;
    if (!font || !text || !background || !color || !transition || !duration) {
      throw new Error('Expected shorthand and longhand compiled styles.');
    }

    expect(mergeCompiledStyles([font, text])).toBe(result.classes['text-sm']);
    expect(mergeCompiledStyles([text, font])).toBe(result.classes['[font:inherit]']);
    expect(mergeCompiledStyles([background, color])).toBe(result.classes['bg-blue-500']);
    expect(mergeCompiledStyles([color, background])).toBe(result.classes['[background:red]']);
    expect(mergeCompiledStyles([transition, duration])).toBe(result.classes['duration-200']);
    expect(mergeCompiledStyles([duration, transition])).toBe(result.classes['[transition:all_1s]']);
  });

  it('lets animation shorthand and independent animation longhands reset each other', () => {
    const result = compileStyleRecords({ animation: 'animate-spin', duration: 'animation-duration-500' });
    const animation = result.styles.animation;
    const duration = result.styles.duration;
    if (!animation || !duration) {
      throw new Error('Expected animation styles.');
