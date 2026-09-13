/**
 * Converts a duration utility value to milliseconds when needed.
 *
 * @param value Utility value.
 * @returns CSS duration value.
 */
export function millisecondsValue(value: string): string {
  return value.startsWith('[') ? value.slice(1, -1) : `${value}ms`;
}
