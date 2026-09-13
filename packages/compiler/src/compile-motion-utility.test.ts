import { describe, expect, it } from 'vitest';

import { compileMotionUtility } from './compile-motion-utility';
import { parseTheme } from './theme';

describe('compileMotionUtility', () => {
  const baseTheme = parseTheme();
  const theme = {
    ...baseTheme,
    keyframes: { ...baseTheme.keyframes, hero: '@keyframes hero{to{opacity:1}}' },
    tokens: {
      ...baseTheme.tokens,
      '--duration-fast': '120ms',
      '--animation-delay-long': '300ms',
      '--animation-ease-custom': 'linear(0, 1)',
      '--stagger-gentle': '40ms',
    },
  };
  const firstDeclaration = (utility: string, negative = false) => {
    const declarations = compileMotionUtility(utility, negative, theme);
    return Array.isArray(declarations) ? declarations[0] : declarations;
  };

  it('compiles transition properties, time values, easing, and stagger delays', () => {
    expect(compileMotionUtility('transition-transform-opacity', false, theme)).toHaveLength(3);
    expect(firstDeclaration('transition-[opacity,transform]')?.value).toBe('opacity,transform');
    expect(firstDeclaration('duration-100')).toEqual({
      property: 'transition-duration',
      value: '100ms',
    });
    expect(firstDeclaration('delay-(--time)', true)?.value).toBe('calc(var(--time) * -1)');
    expect(firstDeclaration('duration-100', true)).toBeNull();
    expect(firstDeclaration('ease-in')?.property).toBe('transition-timing-function');
    expect(firstDeclaration('ease-invalid')).toBeNull();
    expect(firstDeclaration('delay-stagger')?.property).toBe('transition-delay');
    expect(firstDeclaration('delay-stagger', true)).toBeNull();
  });

  it('compiles animation names, time values, easing, and longhand controls', () => {
    expect(firstDeclaration('animation-name-none')).toEqual({
      property: 'animation-name',
      value: 'none',
    });
    expect(firstDeclaration('animation-name-[hero]')?.value).toBe('hero');
    expect(firstDeclaration('animation-name-hero')?.value).toBe('hero');
    expect(firstDeclaration('animation-name-missing')).toBeNull();
    expect(firstDeclaration('animation-name-hero', true)).toBeNull();
    expect(firstDeclaration('animation-delay-stagger')?.property).toBe('animation-delay');
    expect(firstDeclaration('animation-delay-stagger', true)).toBeNull();
    expect(firstDeclaration('animation-duration-auto')?.value).toBe('auto');
    expect(firstDeclaration('animation-duration-100', true)).toBeNull();
    expect(firstDeclaration('animation-delay-long')?.value).toBe('300ms');
    expect(firstDeclaration('animation-ease-custom')?.value).toBe('linear(0, 1)');
    expect(firstDeclaration('animation-ease-custom', true)).toBeNull();
    expect(firstDeclaration('animation-iterations-infinite')?.value).toBe('infinite');
    expect(firstDeclaration('animation-iterations-[2.5]')?.value).toBe('2.5');
    expect(firstDeclaration('animation-iterations-invalid')).toBeNull();
    expect(firstDeclaration('animation-direction-reverse')?.value).toBe('reverse');
    expect(firstDeclaration('animation-direction-reverse', true)).toBeNull();
    expect(firstDeclaration('animation-fill-both')?.value).toBe('both');
    expect(firstDeclaration('animation-fill-both', true)).toBeNull();
    expect(firstDeclaration('animation-paused')?.value).toBe('paused');
    expect(firstDeclaration('animation-paused', true)).toBeNull();
    expect(firstDeclaration('animation-composition-add')?.value).toBe('add');
    expect(firstDeclaration('animation-composition-add', true)).toBeNull();
  });

  it('compiles stagger controls and delegates timeline and view-transition families', () => {
    expect(firstDeclaration('stagger-reverse')).toEqual({
      property: '--cssx-stagger-reverse',
      value: '1',
    });
    expect(firstDeclaration('stagger-reverse', true)).toBeNull();
    expect(firstDeclaration('stagger-gentle')?.value).toBe('40ms');
    expect(firstDeclaration('stagger-index-[2]')?.value).toBe('2');
    expect(firstDeclaration('stagger-count-4')?.property).toBe('--cssx-stagger-count');
    expect(firstDeclaration('stagger-count-4', true)).toBeNull();
    expect(firstDeclaration('stagger-100', true)).toBeNull();
    expect(firstDeclaration('animation-timeline-auto')?.atRule).toContain('animation-timeline');
    expect(firstDeclaration('animation-timeline-auto', true)).toBeNull();
    expect(firstDeclaration('animation-timeline-scroll-y')?.value).toBe('scroll(y)');
    expect(firstDeclaration('view-timeline-axis-x')?.property).toBe('view-timeline-axis');
    expect(firstDeclaration('scroll-timeline-axis-x', true)).toBeNull();
    expect(firstDeclaration('timeline-scope-all')?.value).toBe('all');
    expect(firstDeclaration('animation-range-end-cover')?.property).toBe('animation-range-end');
    expect(firstDeclaration('animation-range-entry', true)).toBeNull();
    expect(firstDeclaration('view-transition-name-none')?.value).toBe('none');
    expect(firstDeclaration('view-transition-name-[inherit]')).toBeNull();
    expect(firstDeclaration('view-transition-name-none', true)).toBeNull();
  });
});
