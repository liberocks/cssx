/**
 * Finds the end of an escaped CSS string.
 *
 * @param selector Selector source.
 * @param start Opening quote position.
 * @param quote Opening quote character.
 * @returns Closing quote position.
 */
export function readSelectorStringEnd(selector: string, start: number, quote: string): number {
  for (let index = start + 1; index < selector.length; index++) {
    if (selector[index] === '\\') {
      index++;
      continue;
    }
    if (selector[index] === quote) {
      return index;
    }
  }
  throw new Error('Invalid CSSX arbitrary selector string.');
}
