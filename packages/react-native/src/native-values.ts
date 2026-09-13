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

/** Converts an opaque CSS OKLCH color to the sRGB hex notation React Native accepts. */
function oklchToSrgbHex(value: string): string | null {
  const match = /^oklch\(([\d.]+)%(?:\s|_)+([\d.]+)(?:\s|_)+([\d.]+)\)$/.exec(value);
  if (!match) {
    return null;
  }
  const lightness = Number(match[1]) / 100;
  const chroma = Number(match[2]);
  const hue = (Number(match[3]) * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${channels
    .map((channel) => {
      const bounded = Math.max(0, Math.min(1, channel));
      const srgb = bounded <= 0.0031308 ? 12.92 * bounded : 1.055 * bounded ** (1 / 2.4) - 0.055;
      return Math.round(srgb * 255)
        .toString(16)
        .padStart(2, '0');
    })
    .join('')}`;
}
