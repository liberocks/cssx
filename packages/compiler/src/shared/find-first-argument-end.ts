/** Returns the first top-level comma or closing paren in a var/env argument. */
export function findFirstArgumentEnd(source: string, startIndex: number, closeIndex: number): number {
  let parenDepth = 0;
  let bracketDepth = 0;
  let quote: '"' | "'" | null = null;
  for (let index = startIndex; index < closeIndex; index++) {
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
      parenDepth++;
    } else if (character === ')') {
      parenDepth--;
    } else if (character === '[') {
      bracketDepth++;
    } else if (character === ']') {
      bracketDepth--;
    } else if (character === ',' && parenDepth === 0 && bracketDepth === 0) {
      return index;
    }
  }
  return closeIndex;
}
