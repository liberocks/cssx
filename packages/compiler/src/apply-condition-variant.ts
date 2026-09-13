import type { VariantOptions } from './apply-variants';
import { normalizeArbitraryAtRule } from './normalize-arbitrary-at-rule';
import { resolveViewTransitionVariant } from './resolve-view-transition-variant';
import { resolveThemeValue } from './theme';
import type { CssxTheme } from './theme';
import type { VariantRenderState } from './variant-render-state';

/**
 * Applies a media, supports, or breakpoint variant to the active render state.
 *
 * @param variant Variant name to apply.
 * @param theme Active theme for breakpoint tokens.
 * @param options Options that affect condition variant rendering.
 * @param state Mutable selectors and at-rules for this candidate.
 * @returns Whether this helper recognized and applied the variant.
 * @throws When an arbitrary responsive variant is invalid.
 */
export function applyConditionVariant(
  variant: string,
  theme: CssxTheme,
  options: VariantOptions,
  state: VariantRenderState,
): boolean {
  if (variant.startsWith('[') && variant.endsWith(']')) {
    const arbitraryVariant = variant.slice(1, -1);
    if (!arbitraryVariant.startsWith('@supports') && !arbitraryVariant.startsWith('@media')) {
      return false;
    }
    state.atRules.push(normalizeArbitraryAtRule(arbitraryVariant));
  } else if (variant === 'dark') {
    if (options.darkMode && options.darkMode !== 'media') {
      const darkSelector = options.darkMode === 'class' ? '.dark' : '[data-theme=dark]';
      state.selectors = state.selectors.map((selector) => `${selector}:where(${darkSelector}, ${darkSelector} *)`);
    } else {
      state.atRules.push('@media (prefers-color-scheme: dark)');
    }
  } else if (variant === 'motion-safe') {
    state.atRules.push('@media (prefers-reduced-motion: no-preference)');
  } else if (variant === 'motion-reduce') {
    state.atRules.push('@media (prefers-reduced-motion: reduce)');
  } else if (variant === 'starting') {
    state.atRules.push('@starting-style');
  } else if (resolveViewTransitionVariant(variant)) {
    const pseudoElement = resolveViewTransitionVariant(variant)!;
    state.selectors = state.selectors.map((selector) => `${selector}${pseudoElement}`);
    state.atRules.push('@supports (view-transition-name: none)');
  } else if (variant === 'print') {
    state.atRules.push('@media print');
  } else if (variant.startsWith('supports-[') && variant.endsWith(']')) {
    state.atRules.push(`@supports (${variant.slice(10, -1).replace(':', ': ')})`);
  } else if (variant.startsWith('not-supports-[') && variant.endsWith(']')) {
    state.atRules.push(`@supports not (${variant.slice(14, -1).replace(':', ': ')})`);
  } else if ((variant.startsWith('min-[') || variant.startsWith('max-[')) && variant.endsWith(']')) {
    const value = variant.slice(5, -1);
    if (!value || /[;{}]/.test(value)) {
      throw new Error(`Invalid CSSX responsive variant "${variant}".`);
    }
    state.atRules.push(variant.startsWith('min-') ? `@media (width >= ${value})` : `@media (width < ${value})`);
  } else if (variant.startsWith('max-')) {
    const breakpoint = resolveThemeValue(theme, `--breakpoint-${variant.slice(4)}`);
    if (!breakpoint) {
      return false;
    }
    state.atRules.push(`@media (width < ${breakpoint})`);
  } else {
    const breakpoint = resolveThemeValue(theme, `--breakpoint-${variant}`);
    if (!breakpoint) {
      return false;
    }
    state.atRules.push(`@media (width >= ${breakpoint})`);
  }
  return true;
}
