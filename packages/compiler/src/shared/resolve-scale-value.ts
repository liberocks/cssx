import { resolveArbitraryCssValue } from './resolve-arbitrary-css-value';

/**
 * Resolves a percentage scale utility value.
 *
 * @param value Utility value.
 * @param negative Whether to negate the value.
 * @returns CSS scale number, or null when unsupported.
 */
export function resolveScaleValue(value: string, negative: boolean): string | null {
  if (value.startsWith('[') && value.endsWith(']')) {
    return `${negative ? '-' : ''}${resolveArbitraryCssValue(value)}`;
  }
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const fraction = Number(value) / 100;
  return negative ? `-${fraction}` : String(fraction);
}
