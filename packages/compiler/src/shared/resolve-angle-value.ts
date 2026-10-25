import { resolveArbitraryCssValue } from './resolve-arbitrary-css-value';

/**
 * Resolves a degree or arbitrary angle value.
 *
 * @param value Utility value.
 * @param negative Whether to negate the value.
 * @returns CSS angle, or null when unsupported.
 */
export function resolveAngleValue(value: string, negative: boolean): string | null {
  if (value.startsWith('[') && value.endsWith(']')) {
    return `${negative ? '-' : ''}${resolveArbitraryCssValue(value)}`;
  }
  if (!/^\d+$/.test(value)) {
    return null;
  }
  return `${negative ? '-' : ''}${value}deg`;
}
