/** Masks CSSX utility literals so an adapter can identify CSS-only source edits. */
export function cssOnlySignature(
  source: string,
  ranges: readonly { readonly start: number; readonly end: number }[],
): string {
  const chunks: string[] = [];
  let position = 0;
  for (const { start, end } of [...ranges].sort((left, right) => left.start - right.start)) {
    chunks.push(source.slice(position, start));
    position = end;
  }
  chunks.push(source.slice(position));
  return chunks.join('');
}
