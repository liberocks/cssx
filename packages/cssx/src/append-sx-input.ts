import type { SxInput } from './types';

/**
 * Appends one nested `sx` input to a mutable class-name list.
 *
 * @param input Class input to append.
 * @param classes Mutable class-name list.
 * @returns Nothing after appending non-empty class names.
 */
export function appendSxInput(input: SxInput, classes: string[]): void {
  if (!input) {
    return;
  }
  if (typeof input === 'string') {
    classes.push(input);
    return;
  }
  for (const value of input) {
    appendSxInput(value, classes);
  }
}
