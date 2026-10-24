/**
 * Checks a CSS-wide-keyword-safe custom identifier.
 *
 * @param value Identifier text to check.
 * @param reserved Extra identifiers treated as reserved.
 * @returns True when the value is a usable custom identifier.
 */
export function isCustomIdentifier(value: string, reserved: readonly string[]): boolean {
  return (
    /^[a-z_][a-z0-9_-]*$/i.test(value) &&
    !reserved.includes(value.toLowerCase()) &&
    !/^(?:inherit|initial|revert|revert-layer|unset)$/i.test(value)
  );
}
