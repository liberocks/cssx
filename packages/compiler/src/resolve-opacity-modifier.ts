/**
 * Validates and normalizes an opacity percentage.
 *
 * @param value Opacity utility value.
 * @returns Percentage text, or null when invalid.
 */
export function resolveOpacityModifier(value: string): string | null {
  const raw = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value;
  if (!/^\d+(?:\.\d+)?$/.test(raw)) {
    return null;
  }
  const opacity = Number(raw);
  if (opacity < 0 || opacity > 100) {
    return null;
  }
  return String(opacity);
}
