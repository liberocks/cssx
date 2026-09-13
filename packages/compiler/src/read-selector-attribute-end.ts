import { readSelectorStringEnd } from './read-selector-string-end';

/**
 * Finds the matching end of an attribute selector.
 *
 * @param selector Selector source.
 * @param start Opening bracket position.
 * @returns Closing bracket position.
 */
export function readSelectorAttributeEnd(selector: string, start: number): number {
  let depth = 1;
  for (let index = start + 1; index < selector.length; index++) {
    const character = selector[index];
    if (character === '\\') {
      index++;
      continue;
    }
    if (character === '"' || character === "'") {
      index = readSelectorStringEnd(selector, index, character);
      continue;
    }
    if (character === '[') {
      depth++;
    }
    if (character === ']') {
      depth--;
    }
    if (depth === 0) {
      return index;
    }
  }
  throw new Error('Invalid CSSX arbitrary selector attribute.');
}
