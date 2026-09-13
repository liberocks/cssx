import type { CssxCandidateOrigin } from './stylesheet';
import { sourceOffsetAtOrigin } from './source-offset-at-origin';
import { sourceOriginAtOffset } from './source-origin-at-offset';

/** Remaps child-module candidate origins to the enclosing Vue SFC source. */
export function remapVueBlockOrigins(
  source: string,
  blockOffset: number,
  childOrigins: Readonly<Record<string, CssxCandidateOrigin>>,
): Record<string, CssxCandidateOrigin> {
  const origins: Record<string, CssxCandidateOrigin> = {};
  const childSource = source.slice(blockOffset);
  for (const [candidate, origin] of Object.entries(childOrigins)) {
    origins[candidate] = sourceOriginAtOffset(source, blockOffset + sourceOffsetAtOrigin(childSource, origin));
  }
  return origins;
}
