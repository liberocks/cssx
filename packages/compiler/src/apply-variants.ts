import { groupStateVariantName } from './group-state-variant-name';
import { isGroupStateVariant } from './is-group-state-variant';
import { isPeerStateVariant } from './is-peer-state-variant';
import { isStateVariant } from './is-state-variant';
import { normalizeArbitraryAtRule } from './normalize-arbitrary-at-rule';
import { normalizeArbitrarySelector } from './normalize-arbitrary-selector';
import { peerStateVariantName } from './peer-state-variant-name';
import { PSEUDO_CLASS_VARIANTS, PSEUDO_ELEMENT_VARIANTS } from './pseudo-variant-selectors';
import { resolveViewTransitionVariant } from './resolve-view-transition-variant';
import { replaceNestingSelectors } from './selector';
import { stateVariantName } from './state-variant-name';
import { resolveThemeValue, type CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';
import { validateVariantCombination } from './validate-variant-combination';

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
  let renderedSelectors = typeof selectors === 'string' ? [selectors] : [...selectors];
  let selectorSuffix = declarations[0]?.selectorSuffix ?? '';
  if (declarations.some((declaration) => (declaration.selectorSuffix ?? '') !== selectorSuffix)) {
    throw new Error('CSSX utility declarations must share one selector scope.');
  }
  const atRules: string[] = [];
  let requiresPseudoContent = false;
  for (const variant of variants) {
    if (variant === '*') {
      renderedSelectors = renderedSelectors.map((selector) => `:is(${selector}${selectorSuffix} > *)`);
      selectorSuffix = '';
    } else if (variant === '**') {
      renderedSelectors = renderedSelectors.map((selector) => `:is(${selector}${selectorSuffix} *)`);
      selectorSuffix = '';
    } else if (variant === 'hover') {
      renderedSelectors = renderedSelectors.map((selector) => `${selector}:hover`);
      atRules.push('@media (hover: hover)');
    } else if (PSEUDO_CLASS_VARIANTS[variant]) {
      renderedSelectors = renderedSelectors.map((selector) => `${selector}:${PSEUDO_CLASS_VARIANTS[variant]}`);
    } else if (PSEUDO_ELEMENT_VARIANTS[variant]) {
      renderedSelectors = renderedSelectors.map((selector) => `${selector}::${PSEUDO_ELEMENT_VARIANTS[variant]}`);
      requiresPseudoContent ||= variant === 'before' || variant === 'after';
    } else if (stateVariantName(variant)) {
      renderedSelectors = renderedSelectors.map((selector) => `${selector}:state(${stateVariantName(variant)})`);
    } else if (groupStateVariantName(variant)) {
      renderedSelectors = renderedSelectors.map(
        (selector) => `.group:state(${groupStateVariantName(variant)}) ${selector}`,
      );
    } else if (peerStateVariantName(variant)) {
      renderedSelectors = renderedSelectors.map(
        (selector) => `.peer:state(${peerStateVariantName(variant)}) ~ ${selector}`,
      );
    } else if (isGroupStateVariant(variant)) {
      const state = variant.slice('group-'.length);
      renderedSelectors = renderedSelectors.map((selector) => `.group:${PSEUDO_CLASS_VARIANTS[state]!} ${selector}`);
    } else if (isPeerStateVariant(variant)) {
      const state = variant.slice('peer-'.length);
      renderedSelectors = renderedSelectors.map((selector) => `.peer:${PSEUDO_CLASS_VARIANTS[state]!} ~ ${selector}`);
    } else if (variant.startsWith('has-[') && variant.endsWith(']')) {
      renderedSelectors = renderedSelectors.map((selector) => `${selector}:has(${variant.slice(5, -1)})`);
    } else if (variant.startsWith('has-') && isStateVariant(variant.slice(4))) {
      const state = variant.slice(4);
      renderedSelectors = renderedSelectors.map((selector) => `${selector}:has(*:${PSEUDO_CLASS_VARIANTS[state]!})`);
    } else if (variant.startsWith('not-') && isStateVariant(variant.slice(4))) {
      const state = variant.slice(4);
      renderedSelectors = renderedSelectors.map((selector) => `${selector}:not(*:${PSEUDO_CLASS_VARIANTS[state]!})`);
    } else if (variant.startsWith('in-') && isStateVariant(variant.slice(3))) {
      const state = variant.slice(3);
      renderedSelectors = renderedSelectors.map((selector) => `:where(*:${PSEUDO_CLASS_VARIANTS[state]!}) ${selector}`);
    } else if (variant.startsWith('[') && variant.endsWith(']')) {
      const arbitraryVariant = variant.slice(1, -1);
      if (arbitraryVariant.startsWith('@supports') || arbitraryVariant.startsWith('@media')) {
        atRules.push(normalizeArbitraryAtRule(arbitraryVariant));
      } else {
        const rewrittenSelectors = renderedSelectors.map((selector) =>
          replaceNestingSelectors(normalizeArbitrarySelector(arbitraryVariant), `${selector}${selectorSuffix}`),
        );
        if (rewrittenSelectors.some((selector) => selector === null)) {
          throw new Error(`CSSX arbitrary selector variant "${variant}" must contain "&".`);
        }
        renderedSelectors = rewrittenSelectors.filter((selector): selector is string => selector !== null);
        selectorSuffix = '';
      }
    } else if (variant === 'dark') {
      if (options.darkMode && options.darkMode !== 'media') {
        const darkSelector = options.darkMode === 'class' ? '.dark' : '[data-theme=dark]';
        renderedSelectors = renderedSelectors.map(
          (selector) => `${selector}:where(${darkSelector}, ${darkSelector} *)`,
        );
      } else {
        atRules.push('@media (prefers-color-scheme: dark)');
      }
    } else if (variant === 'motion-safe') {
      atRules.push('@media (prefers-reduced-motion: no-preference)');
    } else if (variant === 'motion-reduce') {
      atRules.push('@media (prefers-reduced-motion: reduce)');
    } else if (variant === 'starting') {
      atRules.push('@starting-style');
    } else if (resolveViewTransitionVariant(variant)) {
      const pseudoElement = resolveViewTransitionVariant(variant)!;
      renderedSelectors = renderedSelectors.map((selector) => `${selector}${pseudoElement}`);
      atRules.push('@supports (view-transition-name: none)');
    } else if (variant === 'print') {
      atRules.push('@media print');
    } else if (variant.startsWith('data-[') && variant.endsWith(']')) {
      renderedSelectors = renderedSelectors.map((selector) => `${selector}[data-${variant.slice(6, -1)}]`);
    } else if (/^data-[a-z][a-z0-9_-]*$/i.test(variant)) {
      renderedSelectors = renderedSelectors.map((selector) => `${selector}[${variant}]`);
    } else if (variant.startsWith('aria-[') && variant.endsWith(']')) {
      renderedSelectors = renderedSelectors.map((selector) => `${selector}[aria-${variant.slice(6, -1)}]`);
    } else if (variant.startsWith('aria-')) {
      renderedSelectors = renderedSelectors.map((selector) => `${selector}[aria-${variant.slice(5)}="true"]`);
    } else if (variant.startsWith('supports-[') && variant.endsWith(']')) {
      atRules.push(`@supports (${variant.slice(10, -1).replace(':', ': ')})`);
    } else if (variant.startsWith('not-supports-[') && variant.endsWith(']')) {
      atRules.push(`@supports not (${variant.slice(14, -1).replace(':', ': ')})`);
    } else if ((variant.startsWith('min-[') || variant.startsWith('max-[')) && variant.endsWith(']')) {
      const value = variant.slice(5, -1);
      if (!value || /[;{}]/.test(value)) {
        throw new Error(`Invalid CSSX responsive variant "${variant}".`);
      }
      atRules.push(variant.startsWith('min-') ? `@media (width >= ${value})` : `@media (width < ${value})`);
    } else if (variant.startsWith('max-')) {
      const breakpoint = resolveThemeValue(theme, `--breakpoint-${variant.slice(4)}`);
      if (!breakpoint) {
        throw new Error(`CSSX does not support variant "${variant}".`);
      }
      atRules.push(`@media (width < ${breakpoint})`);
    } else {
      const breakpoint = resolveThemeValue(theme, `--breakpoint-${variant}`);
      if (!breakpoint) {
        throw new Error(`CSSX does not support variant "${variant}".`);
      }
      atRules.push(`@media (width >= ${breakpoint})`);
    }
  }
  const effectiveDeclarations = requiresPseudoContent
    ? [{ property: 'content', value: 'var(--cssx-content, "")' }, ...declarations]
    : declarations;
  const declarationsByAtRule = new Map<string, UtilityDeclaration[]>();
  for (const declaration of effectiveDeclarations) {
    const atRule = declaration.atRule ?? '';
    const values = declarationsByAtRule.get(atRule) ?? [];
    values.push(declaration);
    declarationsByAtRule.set(atRule, values);
  }
  let css = [...declarationsByAtRule]
    .map(([atRule, values]) => {
      const selectorList = renderedSelectors.map((selector) => `${selector}${selectorSuffix}`).join(',');
      const rule = `${selectorList}{${values.map((declaration) => `${declaration.property}:${declaration.value};`).join('')}}`;
      return atRule ? `${atRule}{${rule}}` : rule;
    })
    .join('');
  for (let index = atRules.length - 1; index >= 0; index--) {
    css = `${atRules[index]}{${css}}`;
  }
  return css;
}
