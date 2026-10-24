/**
 * Validates and extracts a bracketed custom state name.
 *
 * @param value Variant name.
 * @param prefix Required variant prefix.
 * @returns Custom state name, or null when the prefix does not match.
 * @throws When a matching variant contains an invalid or reserved name.
 */
export function customStateName(value: string, prefix: string): string | null {
  if (!value.startsWith(`${prefix}[`) || !value.endsWith(']')) {
    return null;
  }
  const name = value.slice(prefix.length + 1, -1);
  if (!/^[a-z_][a-z0-9_-]*$/i.test(name) || /^(?:inherit|initial|revert|revert-layer|unset)$/i.test(name)) {
    throw new Error(`Invalid CSSX custom state variant "${value}".`);
  }
  return name;
}
