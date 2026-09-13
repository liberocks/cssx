/**
 * Converts an opaque OKLCH color to the sRGB hex notation accepted by React Native.
 *
 * @param value Resolved OKLCH color value.
 * @returns The converted color, or null when the value is not supported OKLCH.
 */
export function oklchToSrgbHex(value: string): string | null {
  const match = /^oklch\(([\d.]+)%(?:\s|_)+([\d.]+)(?:\s|_)+([\d.]+)\)$/.exec(value);
  if (!match) {
    return null;
  }
  const lightness = Number(match[1]) / 100;
  const chroma = Number(match[2]);
  const hue = (Number(match[3]) * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037574 * b) ** 3;
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
