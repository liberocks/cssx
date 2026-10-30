/** Removes declaration terminators that are redundant immediately before a block close. */
export function stripTrailingDeclarationSemicolons(css: string): string {
  let compact = '';
  let quote: '"' | "'" | undefined;
  let escaped = false;
  let comment = false;

  for (let index = 0; index < css.length; index += 1) {
    const character = css[index]!;
    const next = css[index + 1];

    if (comment) {
      compact += character;
      if (character === '*' && next === '/') {
        compact += next;
        index += 1;
        comment = false;
      }
      continue;
    }
    if (quote) {
      compact += character;
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = undefined;
      }
      continue;
    }
    if (character === '/' && next === '*') {
      compact += '/*';
      index += 1;
      comment = true;
      continue;
    }
    if (character === '"' || character === "'") {
      compact += character;
      quote = character;
      continue;
    }
    if (character === ';') {
      let closingIndex = index + 1;
      while (closingIndex < css.length && /\s/.test(css[closingIndex]!)) {
        closingIndex += 1;
      }
      if (css[closingIndex] === '}') {
        continue;
      }
    }
    compact += character;
  }

  return compact;
}
