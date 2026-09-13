import { oklchToSrgbHex } from './oklch-to-srgb-hex';

/**
 * Converts a resolved CSS value into a React Native-compatible scalar.
 *
 * @param value Resolved CSS declaration value.
 * @param candidate Source utility used for diagnostics.
 * @returns A numeric or string native style value.
 */
export function nativeValue(value: string, candidate: string): number | string {
  const important = value.endsWith(' !important') ? value.slice(0, -11) : value;
  const calculation = /^calc\((-?[\d.]+)rem \* (-?[\d.]+)\)$/.exec(important);
  if (calculation) {
    return Number(calculation[1]) * 16 * Number(calculation[2]);
  }
  const rem = /^(-?[\d.]+)rem$/.exec(important);
  if (rem) {
    return Number(rem[1]) * 16;
  }
  const pixels = /^(-?[\d.]+)px$/.exec(important);
  if (pixels) {
    return Number(pixels[1]);
  }
  if (/^-?[\d.]+$/.test(important)) {
    return Number(important);
  }
  if (/^(?:#|rgb|rgba|hsl|hsla|hwb|transparent|black|white)/.test(important) || important.endsWith('%')) {
    return important;
  }
  const oklch = oklchToSrgbHex(important);
  if (oklch) {
    return oklch;
  }
  if (important.startsWith('var(') || important.startsWith('color-mix(') || important.startsWith('oklch(')) {
    throw new Error(`CSSX React Native requires "${candidate}" to resolve to a native color or value at build time.`);
  }
  return important;
}
