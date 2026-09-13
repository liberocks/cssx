/**
 * Detects delimiters that are forbidden anywhere in a value-only arbitrary input.
 *
 * @param value Arbitrary candidate part to inspect.
 * @returns Whether the part contains unsafe arbitrary syntax.
 */
export function containsUnsafeArbitrarySyntax(value: string): boolean {
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
    if (character === ';' || character === '{' || character === '}') {
      return true;
    }
  }
  return false;
}
