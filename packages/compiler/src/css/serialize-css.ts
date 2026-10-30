import type { CssxRule } from './cssx-rule';
import { stripTrailingDeclarationSemicolons } from './strip-trailing-declaration-semicolons';

/**
 * Joins unique CSS rules in a stable order.
 *
 * @param rules Generated CSS rules.
 * @param options Optional CSS layer settings.
 * @param options.layer CSS layer that wraps the generated rules.
 * @returns The final CSS string.
 */
export function serializeCss(rules: readonly CssxRule[], options: { readonly layer?: string } = {}): string {
  const css = stripTrailingDeclarationSemicolons([...new Set(rules.map((rule) => rule.css))].sort().join(''));
  return css && options.layer ? `@layer ${options.layer}{${css}}` : css;
}
