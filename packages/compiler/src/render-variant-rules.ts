import type { UtilityDeclaration } from './utility-types';
import type { VariantRenderState } from './variant-render-state';

/**
 * Groups declarations by their own conditions and wraps the resulting rules.
 *
 * @param state Rendered selectors and ordered variant at-rules.
 * @param declarations Utility declarations to serialize.
 * @returns CSS rules wrapped in declaration and variant at-rules.
 */
export function renderVariantRules(state: VariantRenderState, declarations: readonly UtilityDeclaration[]): string {
  const effectiveDeclarations = state.requiresPseudoContent
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
      const selectorList = state.selectors.map((selector) => `${selector}${state.selectorSuffix}`).join(',');
      const rule = `${selectorList}{${values.map((declaration) => `${declaration.property}:${declaration.value};`).join('')}}`;
      return atRule ? `${atRule}{${rule}}` : rule;
    })
    .join('');
  for (let index = state.atRules.length - 1; index >= 0; index--) {
    css = `${state.atRules[index]}{${css}}`;
  }
  return css;
}
