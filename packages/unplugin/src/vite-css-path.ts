import { sep } from 'node:path';

import { validateCssFileName } from './validate-css-file-name';

/**
 * Creates the development-server URL for an extracted stylesheet.
 *
 * @param base Development server base path.
 * @param fileName Relative CSS output path.
 * @returns An absolute URL path for the stylesheet.
 */
export function viteCssPath(base: string | undefined, fileName: string): string {
  const normalizedBase = base && base !== '/' ? `/${base.replace(/^\/+|\/+$/g, '')}` : '';
  return `${normalizedBase}/${validateCssFileName(fileName).replaceAll(sep, '/')}`;
}
