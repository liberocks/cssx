/**
 * Resolves a bounded percentage gradient position.
 *
 * @param value Utility value.
 * @returns CSS percentage, or null when invalid.
 */
export function resolveGradientPosition(value: string): string | null {
  const raw = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value;
  if (!/^\d+(?:\.\d+)?%$/.test(raw)) {
    return null;
  }
  const position = Number(raw.slice(0, -1));
  return position >= 0 && position <= 100 ? raw : null;
}
