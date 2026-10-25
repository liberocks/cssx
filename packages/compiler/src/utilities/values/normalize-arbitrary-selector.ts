import { resolveArbitraryCssValue } from '../../shared/resolve-arbitrary-css-value';

/**
 * Treats unescaped underscores as spaces in arbitrary selector variants.
 *
 * @param value Arbitrary selector variant value.
 * @returns Selector text with underscores normalized.
 */
export function normalizeArbitrarySelector(value: string): string {
  return resolveArbitraryCssValue(`[${value}]`);
}
