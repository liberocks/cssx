import { resolveArbitraryCssValue } from './utility-resolvers';

/**
 * Resolves a numeric or arbitrary SVG value.
 *
 * @param raw Utility value.
 * @returns CSS value, or null when unsupported.
 */
export function resolveNumericSvgValue(raw: string): string | null {
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    return raw;
  }
  if (raw.startsWith('[') || raw.startsWith('(')) {
    return resolveArbitraryCssValue(raw);
  }
  return null;
}
