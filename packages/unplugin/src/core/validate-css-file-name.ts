import { isAbsolute, normalize, sep } from 'node:path';

/**
 * Validates a relative CSS output path.
 *
 * @param fileName CSS output path to validate.
 * @returns The normalized relative CSS path.
 */
export function validateCssFileName(fileName: string): string {
  if (!fileName || isAbsolute(fileName)) {
    throw new Error('cssFileName must be a non-empty relative path.');
  }
  const normalized = normalize(fileName);
  if (normalized === '..' || normalized.startsWith(`..${sep}`)) {
    throw new Error('cssFileName must not escape the bundler output directory.');
  }
  if (!normalized.endsWith('.css')) {
    throw new Error('cssFileName must end in .css.');
  }
  return normalized;
}
