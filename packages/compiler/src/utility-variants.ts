import { replaceNestingSelectors } from './selector';
import { resolveThemeValue, type CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Applies selector and responsive variants around one utility rule.
 *
 * @param selectors Base generated class selectors.
 * @param declarations Declarations to render.
 * @param variants Ordered variants to apply.
 * @param theme Active resolved theme for breakpoints.
 * @returns Complete CSS rule with selector and at-rule wrappers.
 */
export function applyVariants(
  selectors: string | readonly string[],
  declarations: readonly UtilityDeclaration[],
  variants: readonly string[],
  theme: CssxTheme,
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
      renderedSelectors = renderedSelectors.map(
        (selector) => `.group:${PSEUDO_CLASS_VARIANTS[state] ?? state} ${selector}`,
      );
    } else if (isPeerStateVariant(variant)) {
      const state = variant.slice('peer-'.length);
      renderedSelectors = renderedSelectors.map(
        (selector) => `.peer:${PSEUDO_CLASS_VARIANTS[state] ?? state} ~ ${selector}`,
      );
    } else if (variant.startsWith('has-[') && variant.endsWith(']')) {
      renderedSelectors = renderedSelectors.map((selector) => `${selector}:has(${variant.slice(5, -1)})`);
    } else if (variant.startsWith('has-') && isStateVariant(variant.slice(4))) {
      const state = variant.slice(4);
      renderedSelectors = renderedSelectors.map(
        (selector) => `${selector}:has(*:${PSEUDO_CLASS_VARIANTS[state] ?? state})`,
      );
    } else if (variant.startsWith('not-') && isStateVariant(variant.slice(4))) {
      const state = variant.slice(4);
      renderedSelectors = renderedSelectors.map(
        (selector) => `${selector}:not(*:${PSEUDO_CLASS_VARIANTS[state] ?? state})`,
      );
    } else if (variant.startsWith('in-') && isStateVariant(variant.slice(3))) {
      const state = variant.slice(3);
      renderedSelectors = renderedSelectors.map(
        (selector) => `:where(*:${PSEUDO_CLASS_VARIANTS[state] ?? state}) ${selector}`,
      );
    } else if (variant.startsWith('[') && variant.endsWith(']')) {
      const arbitraryVariant = variant.slice(1, -1);
      if (arbitraryVariant.startsWith('@supports') || arbitraryVariant.startsWith('@media')) {
        atRules.push(normalizeArbitraryAtRule(arbitraryVariant));
      } else {
        const rewrittenSelectors = renderedSelectors.map((selector) =>
          replaceNestingSelectors(arbitraryVariant, `${selector}${selectorSuffix}`),
        );
        if (rewrittenSelectors.some((selector) => selector === null)) {
          throw new Error(`CSSX arbitrary selector variant "${variant}" must contain "&".`);
        }
        renderedSelectors = rewrittenSelectors.filter((selector): selector is string => selector !== null);
        selectorSuffix = '';
      }
    } else if (variant === 'dark') {
      atRules.push('@media (prefers-color-scheme: dark)');
    } else if (variant === 'motion-safe') {
      atRules.push('@media (prefers-reduced-motion: no-preference)');
    } else if (variant === 'motion-reduce') {
      atRules.push('@media (prefers-reduced-motion: reduce)');
    } else if (variant === 'starting') {
      atRules.push('@starting-style');
    } else if (resolveViewTransitionVariant(variant)) {
      const pseudoElement = resolveViewTransitionVariant(variant) ?? '';
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

/** Resolves a View Transition pseudo-element variant to its selector suffix. */
function resolveViewTransitionVariant(variant: string): string | null {
  const match = /^vt-(group|image-pair|old|new)-\[([^\]]+)\]$/i.exec(variant);
  const target = match?.[2] ?? '';
  const validTarget =
    target === '*' ||
    /^\.[a-z_][a-z0-9_-]*$/i.test(target) ||
    (/^[a-z_][a-z0-9_-]*$/i.test(target) && !/^(?:inherit|initial|none|revert|revert-layer|unset)$/i.test(target));
  if (!match || !validTarget) {
    return null;
  }
  return `::view-transition-${match[1]}(${target})`;
}

/** Rejects combinations whose selector categories cannot compose predictably. */
function validateVariantCombination(variants: readonly string[]): void {
  const viewTransitionVariants = variants.filter((variant) => resolveViewTransitionVariant(variant));
  if (viewTransitionVariants.length === 0) {
    return;
  }
  const incompatible = variants.find(
    (variant) =>
      !viewTransitionVariants.includes(variant) &&
      (variant === '*' ||
        variant === '**' ||
        PSEUDO_ELEMENT_VARIANTS[variant] !== undefined ||
        variant.startsWith('group-') ||
        variant.startsWith('peer-') ||
        variant.startsWith('has-') ||
        variant.startsWith('in-') ||
        (variant.startsWith('[') && !variant.startsWith('[@supports') && !variant.startsWith('[@media'))),
  );
  if (viewTransitionVariants.length > 1 || incompatible) {
    throw new Error('CSSX View Transition variants cannot compose with relationship or pseudo-element variants.');
  }
}

/** Supported pseudo-class variants and their selector fragments. */
const PSEUDO_CLASS_VARIANTS: Readonly<Record<string, string>> = {
  hover: 'hover',
  focus: 'focus',
  'focus-visible': 'focus-visible',
  'focus-within': 'focus-within',
  active: 'active',
  disabled: 'disabled',
  visited: 'visited',
  checked: 'checked',
  indeterminate: 'indeterminate',
  default: 'default',
  valid: 'valid',
  invalid: 'invalid',
  'in-range': 'in-range',
  'out-of-range': 'out-of-range',
  'placeholder-shown': 'placeholder-shown',
  autofill: 'autofill',
  'read-only': 'read-only',
  required: 'required',
  optional: 'optional',
  open: 'open',
  target: 'target',
  empty: 'empty',
  enabled: 'enabled',
  first: 'first-child',
  last: 'last-child',
  only: 'only-child',
  odd: 'nth-child(odd)',
  even: 'nth-child(even)',
  'first-of-type': 'first-of-type',
  'last-of-type': 'last-of-type',
  'only-of-type': 'only-of-type',
};

/** Supported pseudo-element variants and their selector fragments. */
const PSEUDO_ELEMENT_VARIANTS: Readonly<Record<string, string>> = {
  before: 'before',
  after: 'after',
  selection: 'selection',
  marker: 'marker',
  file: 'file-selector-button',
  'first-letter': 'first-letter',
  'first-line': 'first-line',
  placeholder: 'placeholder',
};

/**
 * Checks whether a name is a supported pseudo-class state.
 *
 * @param value Variant name.
 * @returns Whether the name is a supported state.
 */
function isStateVariant(value: string): boolean {
  return PSEUDO_CLASS_VARIANTS[value] !== undefined;
}

/**
 * Checks whether a name is a supported group state variant.
 *
 * @param value Variant name.
 * @returns Whether the name is a group state variant.
 */
function isGroupStateVariant(value: string): boolean {
  return value.startsWith('group-') && isStateVariant(value.slice('group-'.length));
}

/**
 * Checks whether a name is a supported peer state variant.
 *
 * @param value Variant name.
 * @returns Whether the name is a peer state variant.
 */
function isPeerStateVariant(value: string): boolean {
  return value.startsWith('peer-') && isStateVariant(value.slice('peer-'.length));
}

/**
 * Reads a custom state variant name.
 *
 * @param value Variant name.
 * @returns Custom state name, or null when the prefix does not match.
 */
function stateVariantName(value: string): string | null {
  return customStateName(value, 'state-');
}

/**
 * Reads a custom group state variant name.
 *
 * @param value Variant name.
 * @returns Custom state name, or null when the prefix does not match.
 */
function groupStateVariantName(value: string): string | null {
  return customStateName(value, 'group-state-');
}

/**
 * Reads a custom peer state variant name.
 *
 * @param value Variant name.
 * @returns Custom state name, or null when the prefix does not match.
 */
function peerStateVariantName(value: string): string | null {
  return customStateName(value, 'peer-state-');
}

/**
 * Validates and extracts a bracketed custom state name.
 *
 * @param value Variant name.
 * @param prefix Required variant prefix.
 * @returns Custom state name, or null when the prefix does not match.
 */
function customStateName(value: string, prefix: string): string | null {
  if (!value.startsWith(`${prefix}[`) || !value.endsWith(']')) {
    return null;
  }
  const name = value.slice(prefix.length + 1, -1);
  if (!/^[a-z_][a-z0-9_-]*$/i.test(name) || /^(?:inherit|initial|revert|revert-layer|unset)$/i.test(name)) {
    throw new Error(`Invalid CSSX custom state variant "${value}".`);
  }
  return name;
}

/**
 * Validates and normalizes a supported arbitrary media or supports rule.
 *
 * @param value Arbitrary at-rule text without brackets.
 * @returns Normalized at-rule.
 */
function normalizeArbitraryAtRule(value: string): string {
  const match = /^@(supports|media)\s*(.*)$/.exec(value);
  const kind = match?.[1];
  const condition = match?.[2]?.trim();
  if (!kind || !condition) {
    throw new Error(`Invalid CSSX arbitrary at-rule variant "[${value}]".`);
  }
  return `@${kind} ${condition}`;
}
