import { sep } from 'node:path';

import { validateCssFileName } from '../core/validate-css-file-name';

/**
 * Creates the development-server URL for an extracted stylesheet.
 *
 * @param base Development server base path.
 * @param fileName Relative CSS output path.
 * @returns An absolute URL path for the stylesheet.
 */
export function viteCssPath(base: string | undefined, fileName: string): string {
  const normalizedBase = base && base !== '/' ? `/${trimSlashes(base)}` : '';
  return `${normalizedBase}/${validateCssFileName(fileName).replaceAll(sep, '/')}`;
}

/** Trims leading and trailing URL separators without regular-expression backtracking. */
function trimSlashes(value: string): string {
  let start = 0;
  let end = value.length;
  while (value.charCodeAt(start) === 47) {
    start++;
  }
  while (end > start && value.charCodeAt(end - 1) === 47) {
    end--;
  }
  return value.slice(start, end);
}
