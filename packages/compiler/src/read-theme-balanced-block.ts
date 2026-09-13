/** Theme block content and the offset immediately after its closing brace. */
export interface ThemeBalancedBlock {
  /** Content inside the outer braces. */
  readonly content: string;
  /** First source offset after the closing brace. */
  readonly end: number;
}

/**
 * Reads one brace-delimited block while honoring quoted strings and escapes.
 *
 * @param source Source containing the opening brace.
 * @param start Position of the opening brace.
 * @returns Block content and the first position after its closing brace.
 */
export function readThemeBalancedBlock(source: string, start: number): ThemeBalancedBlock {
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = start; index < source.length; index++) {
    const character = source[index]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) {
        quote = '';
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '{') {
      depth++;
    }
    if (character === '}') {
      depth--;
    }
    if (depth === 0) {
      return { content: source.slice(start + 1, index), end: index + 1 };
    }
  }
  throw new Error('Unterminated CSSX @theme block.');
}
