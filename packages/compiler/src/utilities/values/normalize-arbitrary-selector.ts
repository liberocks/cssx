/**
 * Treats unescaped underscores as spaces in arbitrary selector variants.
 *
 * @param value Arbitrary selector variant value.
 * @returns Selector text with underscores normalized.
 */
export function normalizeArbitrarySelector(value: string): string {
  return value.replace(/\\_/g, '\u0000').replaceAll('_', ' ').replaceAll('\u0000', '_');
}
