/**
 * Negates a resolved CSS value without assuming it is a numeric literal.
 *
 * @param value CSS value to negate.
 * @returns Negated CSS value.
 */
export function negateCssValue(value: string): string {
  return /^\d/.test(value) ? `-${value}` : `calc(${value} * -1)`;
}
