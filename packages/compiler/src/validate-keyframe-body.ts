import { readThemeBalancedBlock } from './read-theme-balanced-block';
import { skipThemeWhitespaceAndComments } from './skip-theme-whitespace-and-comments';
import { splitThemeDeclarations } from './split-theme-declarations';

/**
 * Validates the restricted selector and declaration grammar allowed in keyframes.
 *
 * @param body Content inside one keyframes rule.
 * @param name Keyframe name used in error messages.
 * @returns Nothing after the complete body passes validation.
 */
export function validateKeyframeBody(body: string, name: string): void {
  let index = 0;
  while (index < body.length) {
    index = skipThemeWhitespaceAndComments(body, index);
    if (index >= body.length) {
      return;
    }
    const selectorStart = index;
    while (body[index] !== '{' && index < body.length) {
      index++;
    }
    const selector = body.slice(selectorStart, index).trim();
    if (!selector || !selector.split(',').every((part) => /^(from|to|\d{1,3}(?:\.\d+)?%)$/.test(part.trim()))) {
      throw new Error(`Invalid CSSX @keyframes selector in ${name}.`);
    }
    if (body[index] !== '{') {
      throw new Error(`Unterminated CSSX @keyframes ${name}.`);
    }
    const declarationBlock = readThemeBalancedBlock(body, index);
    for (const declaration of splitThemeDeclarations(declarationBlock.content)) {
      const separator = declaration.indexOf(':');
      const property = declaration.slice(0, separator).trim();
      const value = declaration.slice(separator + 1).trim();
      if (separator === -1 || !/^(--[a-z0-9_-]+|[a-z-]+)$/i.test(property) || !value || /[{};]/.test(value)) {
        throw new Error(`Invalid CSSX @keyframes declaration in ${name}.`);
      }
    }
    index = declarationBlock.end;
  }
}
