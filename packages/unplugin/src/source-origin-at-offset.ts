import type { CssxCandidateOrigin } from './stylesheet';

/** Returns a zero-based line and column pair for a source offset. */
export function sourceOriginAtOffset(source: string, offset: number): CssxCandidateOrigin {
  const boundedOffset = Math.min(source.length, offset);
  const line = source.slice(0, boundedOffset).split('\n').length - 1;
  const lineStart = source.lastIndexOf('\n', boundedOffset - 1) + 1;
  return { line, column: boundedOffset - lineStart };
}
