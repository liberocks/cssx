import type { CssxCandidateOrigin } from './stylesheet';

/** Returns a zero-based source offset for a zero-based line and column pair. */
export function sourceOffsetAtOrigin(source: string, origin: CssxCandidateOrigin): number {
  const linePrefixLength = source
    .split('\n')
    .slice(0, origin.line)
    .reduce((offset, line) => offset + line.length + 1, 0);
  return Math.min(source.length, linePrefixLength + origin.column);
}
