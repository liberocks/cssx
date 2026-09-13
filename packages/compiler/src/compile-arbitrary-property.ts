import { resolveArbitraryCssValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles a validated arbitrary property utility.
 *
 * @param utility Bracketed property utility.
 * @returns CSS declaration from the property and value.
 * @throws When the property or value is invalid or unsafe.
 */
export function compileArbitraryProperty(utility: string): UtilityDeclaration {
  const content = utility.slice(1, -1);
  const separator = content.indexOf(':');
  const property = content.slice(0, separator).trim();
  const value = content.slice(separator + 1).trim();
  if (!/^(--[a-z0-9_-]+|[a-z-]+)$/i.test(property) || !value || /[{};]/.test(value)) {
    throw new Error(`Invalid arbitrary CSSX utility "${utility}".`);
  }
  return { property, value: resolveArbitraryCssValue(`[${value}]`) };
}
