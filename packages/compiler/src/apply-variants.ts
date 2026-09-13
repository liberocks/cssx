import { applyConditionVariant } from './apply-condition-variant';
import { applySelectorVariant } from './apply-selector-variant';
import { renderVariantRules } from './render-variant-rules';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';
import { validateVariantCombination } from './validate-variant-combination';
import type { VariantRenderState } from './variant-render-state';

/** Controls how the `dark` variant is activated. */
export type DarkMode = 'media' | 'selector' | 'class';

/** Options that affect how variants are rendered. */
export interface VariantOptions {
  /** Activates `dark` variants with a media query, `[data-theme=dark]`, or a `.dark` class. */
  readonly darkMode?: DarkMode;
}

/**
 * Applies selector and responsive variants around one utility rule.
 *
 * @param selectors Base generated class selectors.
 * @param declarations Declarations to render.
 * @param variants Ordered variants to apply.
 * @param theme Active resolved theme for breakpoints.
 * @param options Controls variant rendering options.
 * @returns Complete CSS rule with selector and at-rule wrappers.
 * @throws When a variant is unsupported or cannot safely compose.
 */
export function applyVariants(
  selectors: string | readonly string[],
  declarations: readonly UtilityDeclaration[],
  variants: readonly string[],
  theme: CssxTheme,
  options: VariantOptions = {},
): string {
  validateVariantCombination(variants);
  const state: VariantRenderState = {
    selectors: typeof selectors === 'string' ? [selectors] : [...selectors],
    selectorSuffix: declarations[0]?.selectorSuffix ?? '',
    atRules: [],
    requiresPseudoContent: false,
  };
  if (declarations.some((declaration) => (declaration.selectorSuffix ?? '') !== state.selectorSuffix)) {
    throw new Error('CSSX utility declarations must share one selector scope.');
  }
  for (const variant of variants) {
    if (applySelectorVariant(variant, state) || applyConditionVariant(variant, theme, options, state)) {
      continue;
    }
    throw new Error(`CSSX does not support variant "${variant}".`);
  }
  return renderVariantRules(state, declarations);
}
