import { RUNTIME_STYLESHEET_ATTRIBUTE } from './runtime-constants';

/**
 * Creates and appends the stylesheet used by this runtime.
 *
 * @param document Document receiving the stylesheet.
 * @returns The appended stylesheet.
 */
export function createStylesheet(document: Document): HTMLStyleElement {
  const stylesheet = document.createElement('style');
  stylesheet.setAttribute(RUNTIME_STYLESHEET_ATTRIBUTE, '');
  document.head.append(stylesheet);
  return stylesheet;
}
