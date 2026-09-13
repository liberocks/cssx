import { MAX_NESTING_DEPTH, MAX_UTILITY_LIST_LENGTH } from './candidate-limits';
import { isWhitespaceCode } from './is-whitespace-code';

/**
 * Splits a static utility list without treating whitespace in brackets as separators.
 *
 * @param source Whitespace-separated utility source.
 * @returns Individual utility candidates.
 */
export function splitCandidateList(source: string): readonly string[] {
  if (source.length > MAX_UTILITY_LIST_LENGTH) {
    throw new Error('CSSX utility list exceeds the 16 KiB limit.');
  }
  const candidates: string[] = [];
  let tokenStart = -1;
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote = 0;
  let escaped = false;

  for (let index = 0; index < source.length; index++) {
    const code = source.charCodeAt(index);
    if (tokenStart === -1 && !isWhitespaceCode(code)) {
      tokenStart = index;
    }
    if (escaped) {
      escaped = false;
      continue;
    }
    if (code === 0x5c) {
      escaped = true;
      continue;
    }
    if (quote) {
      if (code === quote) {
        quote = 0;
      }
      continue;
    }
    if (code === 0x22 || code === 0x27) {
      quote = code;
      continue;
    }
    if (code === 0x5b) {
      bracketDepth++;
    }
    if (code === 0x5d) {
      bracketDepth--;
    }
    if (code === 0x28) {
      parenthesisDepth++;
    }
    if (code === 0x29) {
      parenthesisDepth--;
    }
    if (
      bracketDepth < 0 ||
      parenthesisDepth < 0 ||
      bracketDepth > MAX_NESTING_DEPTH ||
      parenthesisDepth > MAX_NESTING_DEPTH
    ) {
      throw new Error(`Invalid utility list "${source}".`);
    }
    if (isWhitespaceCode(code) && bracketDepth === 0 && parenthesisDepth === 0) {
      if (tokenStart !== -1) {
        candidates.push(source.slice(tokenStart, index));
      }
      tokenStart = -1;
      continue;
    }
  }

  if (escaped || quote || bracketDepth !== 0 || parenthesisDepth !== 0) {
    throw new Error(`Invalid utility list "${source}".`);
  }
  if (tokenStart !== -1) {
    candidates.push(source.slice(tokenStart));
  }
  return candidates;
}
