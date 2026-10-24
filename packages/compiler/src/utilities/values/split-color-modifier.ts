/** Color value split from an optional top-level opacity modifier. */
export interface ColorModifier {
  /** Color token or arbitrary value before the modifier. */
  readonly value: string;
  /** Opacity modifier after the slash, when present. */
  readonly opacity?: string;
}

/**
 * Splits a color value from a top-level opacity modifier.
 *
 * @param value Color utility value.
 * @returns Color value and optional opacity text.
 */
export function splitColorModifier(value: string): ColorModifier {
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote = '';
  let escaped = false;
  for (let index = 0; index < value.length; index++) {
    const character = value[index]!;
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
    if (character === '/' && bracketDepth === 0 && parenthesisDepth === 0) {
      return { value: value.slice(0, index), opacity: value.slice(index + 1) };
    }
  }
  return { value };
}
