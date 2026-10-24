import { isLengthArbitraryValue } from './is-length-arbitrary-value';

/**
 * Checks whether a utility suffix represents a color rather than a length.
 *
 * @param value Utility value without its property prefix.
 * @returns Whether the value represents a supported color.
 */
export function isBorderColorValue(value: string): boolean {
  const color = value.split('/', 1)[0]!;
  if (color.startsWith('[') && color.endsWith(']')) {
    return !isLengthArbitraryValue(color.slice(1, -1));
  }
  return /^(?:transparent|current|black|white|[a-z-]+-\d{1,3})$/i.test(color);
}
