/**
 * Decodes bracketed or variable shorthand utility values.
 *
 * @param value Raw arbitrary utility value.
 * @returns CSS value with escaped underscores preserved.
 */
export function resolveArbitraryCssValue(value: string): string {
  if (value.startsWith('(') && value.endsWith(')')) {
    return `var(${value.slice(1, -1)})`;
  }
  const raw = value.slice(1, -1);
  return raw.replaceAll('\\_', '\u0000').replaceAll('_', ' ').replaceAll('\u0000', '_');
}
