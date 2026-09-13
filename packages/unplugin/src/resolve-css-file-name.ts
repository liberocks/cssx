import { stableId } from './stable-id';
import { validateCssFileName } from './validate-css-file-name';

/**
 * Resolves a CSS output template and replaces each `[hash]` marker.
 *
 * @param template Relative CSS output path template.
 * @param css Generated CSS used to calculate the hash.
 * @returns A validated relative CSS output path.
 */
export function resolveCssFileName(template: string, css: string): string {
  return validateCssFileName(template).replaceAll('[hash]', stableId(css));
}
