import type { CssxSourceMap } from './stylesheet-types';

/**
 * Serializes a CSS source map for an emitted stylesheet.
 *
 * @param map Generated CSS source map.
 * @param fileName Name of the emitted CSS file.
 * @returns JSON source map content with its output file name.
 */
export function cssSourceMap(map: CssxSourceMap, fileName: string): string {
  return JSON.stringify({ ...map, file: fileName });
}
