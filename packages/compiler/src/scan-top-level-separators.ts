import { MAX_NESTING_DEPTH } from './candidate-limits';
import { isWhitespaceCode } from './is-whitespace-code';

/** Separator source used while scanning nested candidate syntax. */
export type TopLevelSeparatorMode =
  { readonly kind: 'whitespace' } | { readonly kind: 'character'; readonly value: string };

/** One top-level separator's UTF-16 source position and width. */
export interface TopLevelSeparator {
  /** Start position in the source string. */
  readonly index: number;
  /** UTF-16 width of the separator character. */
  readonly length: number;
}

/** Result of scanning a candidate for top-level separators. */
export interface TopLevelSeparatorScan {
  /** Separators encountered before completion or an invalid construct. */
  readonly separators: readonly TopLevelSeparator[];
  /** Whether all quotes, escapes, and nested groups were balanced and within limits. */
  readonly valid: boolean;
}

/**
 * Finds separators that are not escaped or nested in brackets, parentheses, or strings.
 *
 * @param source Candidate source to scan.
 * @param mode Separator form to recognize at top level.
 * @returns Separator positions and whether the scanned syntax is balanced.
 */
export function scanTopLevelSeparators(source: string, mode: TopLevelSeparatorMode): TopLevelSeparatorScan {
  const separators: TopLevelSeparator[] = [];
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote = '';
  let escaped = false;

  for (let index = 0; index < source.length;) {
    const codePoint = source.codePointAt(index)!;
    const character = String.fromCodePoint(codePoint);
    if (escaped) {
      escaped = false;
      index += character.length;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      index += character.length;
      continue;
    }
    if (quote) {
      if (character === quote) {
        quote = '';
      }
      index += character.length;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      index += character.length;
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
      return { separators, valid: false };
    }
    const isSeparator = mode.kind === 'whitespace' ? isWhitespaceCode(codePoint) : character === mode.value;
    if (isSeparator && bracketDepth === 0 && parenthesisDepth === 0) {
      separators.push({ index, length: character.length });
    }
    index += character.length;
  }

  return { separators, valid: !escaped && !quote && bracketDepth === 0 && parenthesisDepth === 0 };
}
