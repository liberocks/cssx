/**
 * Formats an optional gradient color-space or hue-interpolation modifier.
 *
 * @param raw Requested interpolation mode.
 * @returns The CSS gradient interpolation prefix.
 */
export function gradientInterpolation(raw: string | undefined): string {
  if (!raw) {
    return '';
  }
  if (raw === 'longer' || raw === 'shorter' || raw === 'increasing' || raw === 'decreasing') {
    return `in oklch ${raw} hue `;
  }
  return `in ${raw} `;
}
