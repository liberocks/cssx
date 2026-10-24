/**
 * Reads a supported non-computed object property name.
 *
 * It accepts identifier, string literal, and numeric literal keys. Other key forms return null.
 *
 * @param property Object property to inspect.
 * @param t Babel node helpers.
 * @returns The property name, or null when the key is unsupported.
 */
export function objectPropertyName(
  property: import('@babel/types').ObjectProperty,
  t: typeof import('@babel/types'),
): string | null {
  if (t.isIdentifier(property.key)) {
    return property.key.name;
  }
  if (t.isStringLiteral(property.key) || t.isNumericLiteral(property.key)) {
    return String(property.key.value);
  }
  return null;
}
