/**
 * Resolves a degree or arbitrary angle value.
 *
 * @param value Utility value.
 * @param negative Whether to negate the value.
 * @returns CSS angle, or null when unsupported.
 */
export function resolveAngleValue(value: string, negative: boolean): string | null {
  if (value.startsWith('[') && value.endsWith(']')) {
    return `${negative ? '-' : ''}${value.slice(1, -1)}`;
  }
  if (!/^\d+$/.test(value)) {
    return null;
  }
  return `${negative ? '-' : ''}${value}deg`;
}
