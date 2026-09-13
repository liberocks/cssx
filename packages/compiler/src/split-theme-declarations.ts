import { consumeEscapedOrQuotedCharacter } from './consume-escaped-or-quoted-character';

/**
 * Splits declarations without treating semicolons in strings or functions as separators.
 *
 * @param block Declaration source to scan.
 * @returns Trimmed non-empty declarations.
 */
export function splitThemeDeclarations(block: string): readonly string[] {
  const declarations: string[] = [];
  let token = '';
  let quote = '';
  let escaped = false;
  let parenthesisDepth = 0;
  for (const character of block) {
    const protectedCharacter = consumeEscapedOrQuotedCharacter(character, quote, escaped);
    if (protectedCharacter.protected) {
      token += character;
      quote = protectedCharacter.quote;
      escaped = protectedCharacter.escaped;
      continue;
    }
    if (character === '(') {
      parenthesisDepth++;
    }
    if (character === ')') {
      parenthesisDepth--;
    }
    if (parenthesisDepth < 0) {
      throw new Error('Invalid CSSX @theme declaration.');
    }
    if (character === ';' && parenthesisDepth === 0) {
      if (token.trim()) {
        declarations.push(token.trim());
      }
      token = '';
      continue;
    }
    token += character;
  }
  if (quote || escaped || parenthesisDepth !== 0) {
    throw new Error('Invalid CSSX @theme declaration.');
  }
  if (token.trim()) {
    declarations.push(token.trim());
  }
  return declarations;
}
