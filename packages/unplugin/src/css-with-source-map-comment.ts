import { basename } from 'node:path';

import type { CssxStylesheet } from './stylesheet-types';

/**
 * Adds a source map comment to CSS when a map exists.
 *
 * @param compiled Generated stylesheet data.
 * @param fileName Name of the emitted CSS file.
 * @returns CSS with a relative source map comment, or unchanged CSS without a map.
 */
export function cssWithSourceMapComment(compiled: CssxStylesheet, fileName: string): string {
  return compiled.map ? `${compiled.css}\n/*# sourceMappingURL=${basename(fileName)}.map */` : compiled.css;
}
