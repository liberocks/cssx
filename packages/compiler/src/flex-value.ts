/**
 * Resolves an integer or fraction to a flex value.
 *
 * @param raw Utility value.
 * @returns CSS flex value, or null when unsupported.
 */
export function flexValue(raw: string): string | null {
  const fraction = /^(\d+)\/(\d+)$/.exec(raw);
  if (!fraction) {
    return /^\d+$/.test(raw) ? raw : null;
  }
  return Number(fraction[2]) === 0 ? null : `calc(${fraction[1]} / ${fraction[2]} * 100%)`;
}
