/**
 * Resolves a supported line-height name.
 *
 * @param value Utility value.
 * @returns CSS line-height value.
 */
export function leadingValue(value: string): string {
  const values: Readonly<Record<string, string>> = {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  };
  return value.startsWith('[') ? value.slice(1, -1) : (values[value] ?? value);
}
