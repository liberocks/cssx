import { findClosingParenthesis } from './find-closing-parenthesis';
import { findFirstArgumentEnd } from './find-first-argument-end';
import { protectedFunctionAt } from './protected-function-at';
import { unescapeUnderscores } from './unescape-underscores';

/**
 * Decodes bracketed or variable shorthand utility values.
 *
 * Unescaped underscores are whitespace aliases, except in URL payloads and
 * variable/environment names where underscores are part of identifiers.
 * `\\_` always writes a literal underscore.
 *
 * @param value Raw arbitrary utility value.
 * @returns CSS value with whitespace aliases decoded.
 */
export function resolveArbitraryCssValue(value: string): string {
  if (value.startsWith('(') && value.endsWith(')')) {
    return `var(${unescapeUnderscores(value.slice(1, -1))})`;
  }

  const source = value.slice(1, -1);
  let result = '';
  let index = 0;
  let quote: '"' | "'" | null = null;

  while (index < source.length) {
    const character = source[index]!;
    if (character === '\\' && source[index + 1] === '_') {
      result += '_';
      index += 2;
      continue;
    }

    if (quote) {
      result += character === '_' ? ' ' : character;
      if (character === '\\' && index + 1 < source.length) {
        result += source[index + 1]!;
        index += 2;
        continue;
      }
      if (character === quote) {
        quote = null;
      }
      index++;
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      result += character;
      index++;
      continue;
    }

    const functionName = protectedFunctionAt(source, index);
    if (functionName) {
      const openIndex = index + functionName.length;
      const closeIndex = findClosingParenthesis(source, openIndex);
      if (functionName.toLowerCase() === 'url' || closeIndex === -1) {
        const endIndex = closeIndex === -1 ? source.length : closeIndex + 1;
        result += unescapeUnderscores(source.slice(index, endIndex));
        index = endIndex;
        continue;
      }

      const argumentEnd = findFirstArgumentEnd(source, openIndex + 1, closeIndex);
      result += source.slice(index, openIndex + 1);
      result += unescapeUnderscores(source.slice(openIndex + 1, argumentEnd));
      index = argumentEnd;
      continue;
    }

    result += character === '_' ? ' ' : character;
    index++;
  }

  return result;
}
