/** Updated quote and escape state after reading one protected syntax character. */
export interface EscapedOrQuotedCharacterResult {
  /** Active quote delimiter, or the empty string when no quote is open. */
  readonly quote: string;
  /** Whether the next character is escaped. */
  readonly escaped: boolean;
  /** Whether the character belongs to quote or escape syntax and must be skipped. */
  readonly protected: boolean;
}

/**
 * Advances quote and escape state while a top-level syntax scanner reads one character.
 *
 * @param character Current Unicode code point as a string.
 * @param quote Active quote delimiter, if any.
 * @param escaped Whether the current character follows an escape character.
 * @returns Updated protected-syntax state and whether scanning should skip delimiters.
 */
export function consumeEscapedOrQuotedCharacter(
  character: string,
  quote: string,
  escaped: boolean,
): EscapedOrQuotedCharacterResult {
  if (escaped) {
    return { quote, escaped: false, protected: true };
  }
  if (character === '\\') {
    return { quote, escaped: true, protected: true };
  }
  if (quote) {
    return { quote: character === quote ? '' : quote, escaped: false, protected: true };
  }
  if (character === '"' || character === "'") {
    return { quote: character, escaped: false, protected: true };
  }
  return { quote: '', escaped: false, protected: false };
}
