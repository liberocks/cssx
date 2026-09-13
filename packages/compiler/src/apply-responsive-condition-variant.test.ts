import { describe, expect, it } from 'vitest';

import { applyResponsiveConditionVariant } from './apply-responsive-condition-variant';
import { parseTheme } from './theme';
import type { VariantRenderState } from './variant-render-state';

const theme = parseTheme('@theme { --breakpoint-tablet: 50rem; }');

/** Creates a fresh state for one responsive-condition assertion. */
function createState(): VariantRenderState {
  return { selectors: ['.x'], selectorSuffix: '', atRules: [], requiresPseudoContent: false };
}

describe('applyResponsiveConditionVariant', () => {
  it('resolves named minimum and maximum breakpoint tokens', () => {
    const state = createState();

    expect(applyResponsiveConditionVariant('tablet', theme, state)).toBe(true);
    expect(applyResponsiveConditionVariant('max-tablet', theme, state)).toBe(true);
    expect(state.atRules).toEqual(['@media (width >= 50rem)', '@media (width < 50rem)']);
  });

  it('applies arbitrary minimum and maximum breakpoints', () => {
    const state = createState();

    expect(applyResponsiveConditionVariant('min-[600px]', theme, state)).toBe(true);
    expect(applyResponsiveConditionVariant('max-[80rem]', theme, state)).toBe(true);
    expect(state.atRules).toEqual(['@media (width >= 600px)', '@media (width < 80rem)']);
  });

  it('rejects empty and unsafe arbitrary breakpoints', () => {
    for (const variant of ['min-[]', 'max-[;]', 'min-[{]', 'max-[}]']) {
      expect(() => applyResponsiveConditionVariant(variant, theme, createState())).toThrow(
        `Invalid CSSX responsive variant "${variant}".`,
      );
    }
  });

  it('returns false when a named breakpoint token does not exist', () => {
    expect(applyResponsiveConditionVariant('max-missing', theme, createState())).toBe(false);
    expect(applyResponsiveConditionVariant('missing', theme, createState())).toBe(false);
  });
});
