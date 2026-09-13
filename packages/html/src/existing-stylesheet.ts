import { RUNTIME_STYLESHEET_ATTRIBUTE } from './runtime-constants';

/**
 * Reads the stylesheet injected by an earlier start call, when present.
 *
 * @param document Document containing runtime styles.
 * @returns The existing stylesheet or null.
 */
export function existingStylesheet(document: Document): HTMLStyleElement | null {
  return document.head.querySelector(`style[${RUNTIME_STYLESHEET_ATTRIBUTE}]`);
}
