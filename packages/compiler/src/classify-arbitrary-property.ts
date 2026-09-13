/**
 * Classifies a valid arbitrary property without interpreting its value.
 *
 * @param utility Bracketed arbitrary property utility.
 * @returns Property-owned semantic group, or null for invalid syntax.
 */
export function classifyArbitraryProperty(utility: string): string | null {
  const property = utility.slice(1, -1).split(':', 1)[0]?.trim().toLowerCase();
  if (!property || !/^(--[a-z0-9_-]+|[a-z-]+)$/i.test(property)) {
    return null;
  }
  return `arbitrary..${property}`;
}
