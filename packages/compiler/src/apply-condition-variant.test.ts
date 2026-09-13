import { describe, expect, it } from 'vitest';

import { applyConditionVariant } from './apply-condition-variant';
import { parseTheme } from './theme';
import type { VariantRenderState } from './variant-render-state';

const theme = parseTheme('@theme { --breakpoint-tablet: 50rem; }');

/** Creates a fresh render state for one condition-variant assertion. */
function createState(): VariantRenderState {
  return { selectors: ['.x'], selectorSuffix: '', atRules: [], requiresPseudoContent: false };
}

describe('applyConditionVariant', () => {
  it('applies arbitrary media/supports and dark-mode conditions', () => {
    const arbitrary = createState();
    expect(applyConditionVariant('[@supports (display: grid)]', theme, {}, arbitrary)).toBe(true);
    expect(arbitrary.atRules).toEqual(['@supports (display: grid)']);

    const darkMedia = createState();
    expect(applyConditionVariant('dark', theme, {}, darkMedia)).toBe(true);
    expect(darkMedia.atRules).toEqual(['@media (prefers-color-scheme: dark)']);

    const darkClass = createState();
    expect(applyConditionVariant('dark', theme, { darkMode: 'class' }, darkClass)).toBe(true);
    expect(darkClass.selectors).toEqual(['.x:where(.dark, .dark *)']);
  });

  it('applies environment, print, starting-style, and view-transition conditions', () => {
    const state = createState();
    for (const variant of ['motion-safe', 'motion-reduce', 'starting', 'print', 'vt-old-[card]']) {
      expect(applyConditionVariant(variant, theme, {}, state)).toBe(true);
    }
    expect(state.atRules).toEqual([
      '@media (prefers-reduced-motion: no-preference)',
      '@media (prefers-reduced-motion: reduce)',
      '@starting-style',
      '@media print',
      '@supports (view-transition-name: none)',
    ]);
    expect(state.selectors).toEqual(['.x::view-transition-old(card)']);
  });

  it('applies named and arbitrary responsive and supports variants', () => {
    const state = createState();
    for (const variant of [
      'supports-[display:grid]',
      'not-supports-[display:flex]',
      'min-[600px]',
      'max-[80rem]',
      'tablet',
      'max-tablet',
    ]) {
      expect(applyConditionVariant(variant, theme, {}, state)).toBe(true);
    }
    expect(state.atRules).toEqual([
      '@supports (display: grid)',
      '@supports not (display: flex)',
      '@media (width >= 600px)',
      '@media (width < 80rem)',
      '@media (width >= 50rem)',
      '@media (width < 50rem)',
    ]);
  });

  it('rejects unsafe arbitrary breakpoints and returns false for unrelated variants', () => {
    expect(() => applyConditionVariant('min-[]', theme, {}, createState())).toThrow('Invalid CSSX responsive variant');
    expect(() => applyConditionVariant('max-[40rem;]', theme, {}, createState())).toThrow(
      'Invalid CSSX responsive variant',
    );
    expect(applyConditionVariant('[@container card]', theme, {}, createState())).toBe(false);
    expect(applyConditionVariant('max-missing', theme, {}, createState())).toBe(false);
    expect(applyConditionVariant('missing', theme, {}, createState())).toBe(false);
  });
});
