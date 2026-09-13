/**
 * Checks whether arbitrary CSS text unambiguously represents a length.
 *
 * @param value Arbitrary value without brackets.
 * @returns Whether the value is safe to compile as a length.
 */
export function isLengthCssValue(value: string): boolean {
  const hasLengthHint = /^(?:length|size):/.test(value);
  const normalized = value.replace(/^(?:length|size):/, '');
  return (
    normalized === '0' ||
    /^-?(?:\d+(?:\.\d+)?)(?:px|rem|em|ch|ex|vw|vh|vmin|vmax|%|cm|mm|in|pt|pc)$/i.test(normalized) ||
    /^(?:calc|min|max|clamp)\(/.test(normalized) ||
    (hasLengthHint && normalized.startsWith('var('))
  );
}
