import { MAX_NESTING_DEPTH } from './candidate-limits';

/**
 * Splits a candidate at separators outside brackets, parentheses, and strings.
 *
 * @param source Candidate source to scan.
 * @param separator Top-level separator to split on.
 * @returns Non-empty source parts.
 */
export function splitTopLevel(source: string, separator: string): string[] {
  const parts: string[] = [];
  let token = '';
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote = '';
  let escaped = false;

  for (const character of source) {
    if (escaped) {
      token += character;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      token += character;
      escaped = true;
      continue;
    }
    if (quote) {
      token += character;
      if (character === quote) {
        quote = '';
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      token += character;
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
    if (
      bracketDepth < 0 ||
      parenthesisDepth < 0 ||
      bracketDepth > MAX_NESTING_DEPTH ||
      parenthesisDepth > MAX_NESTING_DEPTH
    ) {
      throw new Error(`Invalid utility "${source}".`);
    }
    if (character === separator && bracketDepth === 0 && parenthesisDepth === 0) {
      if (!token) {
        throw new Error(`Invalid utility "${source}".`);
      }
      parts.push(token);
      token = '';
      continue;
    }
    token += character;
  }

  if (escaped || quote || bracketDepth !== 0 || parenthesisDepth !== 0) {
    throw new Error(`Invalid utility "${source}".`);
  }
  if (!token) {
    throw new Error(`Invalid utility "${source}".`);
  }
  parts.push(token);
  return parts;
}
