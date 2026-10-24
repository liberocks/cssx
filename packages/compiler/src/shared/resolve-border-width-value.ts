/**
 * Resolves a supported border-width value.
 *
 * @param raw Utility value.
 * @returns CSS width, or null when unsupported.
 */
export function resolveBorderWidthValue(raw: string): string | null {
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw.slice(1, -1);
  }
  return /^(0|2|4|8)$/.test(raw) ? `${raw}px`.replace('0px', '0') : null;
}
