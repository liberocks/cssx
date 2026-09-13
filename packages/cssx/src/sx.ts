import { appendSxInput } from './append-sx-input';
import type { SxInput } from './types';

/**
 * Joins class names and ignores empty values.
 *
 * @param inputs Class names, conditions, or nested lists of them.
 * @returns One space-separated class string.
 */
export function sx(...inputs: readonly SxInput[]): string {
  const classes: string[] = [];
  for (const input of inputs) {
    appendSxInput(input, classes);
  }
  return classes.join(' ');
}
