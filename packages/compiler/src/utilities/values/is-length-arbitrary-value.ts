/**
 * Checks whether arbitrary text is a supported length expression.
 *
 * @param value Arbitrary value without brackets.
 * @returns Whether the value is a length.
 */
export function isLengthArbitraryValue(value: string): boolean {
  const normalized = value.replace(/^(?:length|size):/, '');
  return (
    /^-?(?:\d+(?:\.\d+)?)(?:px|rem|em|ch|ex|vw|vh|vmin|vmax|%|cm|mm|in|pt|pc)$/i.test(normalized) ||
    normalized.startsWith('calc(')
  );
}
