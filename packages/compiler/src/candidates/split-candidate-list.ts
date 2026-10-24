import { MAX_UTILITY_LIST_LENGTH } from './candidate-limits';
import { scanTopLevelSeparators } from './scan-top-level-separators';

/**
 * Splits a static utility list without treating whitespace in brackets as separators.
 *
 * @param source Whitespace-separated utility source.
 * @returns Individual utility candidates.
 */
export function splitCandidateList(source: string): readonly string[] {
  if (source.length > MAX_UTILITY_LIST_LENGTH) {
    throw new Error('CSSX utility list exceeds the 16 KiB limit.');
  }
  const scan = scanTopLevelSeparators(source, { kind: 'whitespace' });
  if (!scan.valid) {
    throw new Error(`Invalid utility list "${source}".`);
  }
  const candidates: string[] = [];
  let tokenStart = 0;
  for (const separator of scan.separators) {
    if (separator.index > tokenStart) {
      candidates.push(source.slice(tokenStart, separator.index));
    }
    tokenStart = separator.index + separator.length;
  }
  if (tokenStart < source.length) {
    candidates.push(source.slice(tokenStart));
  }
  return candidates;
}
