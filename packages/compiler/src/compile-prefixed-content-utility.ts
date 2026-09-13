import { resolveArbitraryCssValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles a `content-*` layout utility.
 *
 * @param utility Utility candidate without variants.
 * @returns Content declaration, or null when the candidate is outside this family.
 */
export function compilePrefixedContentUtility(utility: string): UtilityDeclaration | null {
  if (utility === 'content-none') {
    return { property: 'content', value: 'none' };
  }
  const content = /^content-(\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  return content ? { property: 'content', value: resolveArbitraryCssValue(content[1]!) } : null;
}
