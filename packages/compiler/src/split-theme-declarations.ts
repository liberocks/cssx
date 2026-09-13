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
