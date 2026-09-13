import { resolveArbitraryCssValue } from './utility-resolvers';

/**
 * Resolves bracketed and custom-property shorthand values.
 *
 * @param raw Arbitrary value segment from the utility name.
 * @returns Resolved value, or null when unsupported.
 */
export function arbitraryValue(raw: string): string | null {
  return (raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('(') && raw.endsWith(')'))
    ? resolveArbitraryCssValue(raw)
    : null;
}
