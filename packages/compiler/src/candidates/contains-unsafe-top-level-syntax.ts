/**
 * Detects block and declaration delimiters that escape a nested value.
 *
 * @param value Candidate part to inspect.
 * @returns Whether the part contains unsafe top-level syntax.
 */
export function containsUnsafeTopLevelSyntax(value: string): boolean {
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote = '';
  let escaped = false;
  for (const character of value) {
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
    if (character === '[') {
      bracketDepth++;
    }
    if (character === ']') {
      bracketDepth--;
    }
    if (character === '(') {
      parenthesisDepth++;
    }
    if (character === ')') {
      parenthesisDepth--;
    }
    if (bracketDepth === 0 && parenthesisDepth === 0 && (character === ';' || character === '{' || character === '}')) {
      return true;
    }
  }
  return false;
}
