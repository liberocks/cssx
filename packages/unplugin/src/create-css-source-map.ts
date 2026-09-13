import { advanceCssLocation } from './advance-css-location';
import { encodeCssMappings } from './encode-css-mappings';
import type { CssxCompiledEntry, CssxSourceMap, CssxSourceOrigin, CssxSourceMapPoint } from './stylesheet-types';

/**
 * Creates mappings from generated utility rules to their source locations.
 *
 * @param prefixCss CSS before individual utility rules.
 * @param entries Compiled utility rules in output order.
 * @param origins Source locations indexed by utility string.
 * @returns A CSS source map, or undefined when no source locations exist.
 */
export function createCssSourceMap(
  prefixCss: string,
  entries: readonly CssxCompiledEntry[],
  origins: ReadonlyMap<string, CssxSourceOrigin>,
): CssxSourceMap | undefined {
  const sources = [
    ...new Set(entries.map((entry) => origins.get(entry.candidate)?.id).filter((id): id is string => !!id)),
  ].sort();
  if (sources.length === 0) {
    return undefined;
  }
  const sourceIndexes = new Map(sources.map((source, index) => [source, index]));
  const points: CssxSourceMapPoint[] = [];
  let location = advanceCssLocation({ line: 0, column: 0 }, prefixCss);
  for (const entry of entries) {
    const origin = origins.get(entry.candidate);
    if (origin) {
      points.push({
        ...location,
        source: sourceIndexes.get(origin.id)!,
        originalLine: origin.line,
        originalColumn: origin.column,
      });
    }
    location = advanceCssLocation(location, entry.css);
  }
  return { version: 3, sources, names: [], mappings: encodeCssMappings(points) };
}
