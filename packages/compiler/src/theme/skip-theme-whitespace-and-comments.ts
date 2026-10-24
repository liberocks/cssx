/**
 * Advances over CSS whitespace and complete comments.
 *
 * @param source Source to scan.
 * @param start Start position.
 * @returns First non-whitespace, non-comment position.
 */
export function skipThemeWhitespaceAndComments(source: string, start: number): number {
  let index = start;
  while (index < source.length) {
    if (/\s/.test(source[index]!)) {
      index++;
      continue;
    }
    if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2);
      if (end === -1) {
        throw new Error('Unterminated CSSX theme comment.');
      }
      index = end + 2;
      continue;
    }
    break;
  }
  return index;
}
