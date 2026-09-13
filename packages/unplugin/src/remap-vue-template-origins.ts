import { sourceOffsetAtOrigin } from './source-offset-at-origin';
import { sourceOriginAtOffset } from './source-origin-at-offset';
import type { CssxCandidateOrigin } from './stylesheet';

/** Remaps wrapper-module origins to their static `sx()` call in a Vue template. */
export function remapVueTemplateOrigins(
  source: string,
  callOffset: number,
  wrapperSource: string,
  wrapperPrefixLength: number,
  childOrigins: Readonly<Record<string, CssxCandidateOrigin>>,
): Record<string, CssxCandidateOrigin> {
  const origins: Record<string, CssxCandidateOrigin> = {};
  for (const [candidate, origin] of Object.entries(childOrigins)) {
    const wrapperOffset = sourceOffsetAtOrigin(wrapperSource, origin);
    origins[candidate] = sourceOriginAtOffset(source, callOffset + Math.max(0, wrapperOffset - wrapperPrefixLength));
  }
  return origins;
}
