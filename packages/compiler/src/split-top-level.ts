import { scanTopLevelSeparators } from './scan-top-level-separators';

/**
 * Splits a candidate at separators outside brackets, parentheses, and strings.
 *
 * @param source Candidate source to scan.
 * @param separator Top-level separator to split on.
 * @returns Non-empty source parts.
 */
export function splitTopLevel(source: string, separator: string): string[] {
  const scan = scanTopLevelSeparators(source, { kind: 'character', value: separator });
  if (!scan.valid) {
    throw new Error(`Invalid utility "${source}".`);
  }
  const parts: string[] = [];
  let tokenStart = 0;
  for (const delimiter of scan.separators) {
    if (delimiter.index === tokenStart) {
      throw new Error(`Invalid utility "${source}".`);
    }
    parts.push(source.slice(tokenStart, delimiter.index));
    tokenStart = delimiter.index + delimiter.length;
  }
  if (tokenStart === source.length) {
    throw new Error(`Invalid utility "${source}".`);
  }
  parts.push(source.slice(tokenStart));
  return parts;
}
