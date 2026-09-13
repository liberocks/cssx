import { encodeVlq } from './encode-vlq';
import type { CssxSourceMapPoint } from './stylesheet-types';

/**
 * Encodes generated CSS source map points as source map mappings.
 *
 * @param points Generated and original locations for utility rules.
 * @returns Source map mappings in base64 VLQ form.
 */
export function encodeCssMappings(points: readonly CssxSourceMapPoint[]): string {
  const lines = Array.from({ length: Math.max(0, ...points.map((point) => point.line)) + 1 }, () => [] as string[]);
  let previousSource = 0;
  let previousOriginalLine = 0;
  let previousOriginalColumn = 0;
  let previousGeneratedLine = 0;
  let previousGeneratedColumn = 0;
  for (const point of points) {
    previousGeneratedColumn *= Number(point.line === previousGeneratedLine);
    previousGeneratedLine = point.line;
    lines[point.line]?.push(
      `${encodeVlq(point.column - previousGeneratedColumn)}${encodeVlq(point.source - previousSource)}${encodeVlq(point.originalLine - previousOriginalLine)}${encodeVlq(point.originalColumn - previousOriginalColumn)}`,
    );
    previousGeneratedColumn = point.column;
    previousSource = point.source;
    previousOriginalLine = point.originalLine;
    previousOriginalColumn = point.originalColumn;
  }
  return lines.map((line) => line.join(',')).join(';');
}
