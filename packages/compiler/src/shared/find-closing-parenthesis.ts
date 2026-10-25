/** Returns the matching close paren for a function opening paren. */
export function findClosingParenthesis(source: string, openIndex: number): number {
  let depth = 1;
  let quote: '"' | "'" | null = null;
  for (let index = openIndex + 1; index < source.length; index++) {
    const character = source[index]!;
    if (character === '\\') {
      index++;
      continue;
    }
    if (quote) {
      if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '(') {
      depth++;
    } else if (character === ')' && --depth === 0) {
      return index;
    }
  }
  return -1;
}
