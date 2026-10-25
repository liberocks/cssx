import { parseTheme, splitCandidateList, validateUtilityCandidate } from '@cssxio/compiler';

/**
 * Finds supported CSSX utilities from all class attributes in a document.
 *
 * @param document Document to inspect.
 * @param themeSource Theme source used to validate candidates.
 * @returns Unique valid CSSX utility candidates.
 */
export function collectUtilityCandidates(
  document: Document,
  themeSource: string,
  sourceByAlias: ReadonlyMap<string, string> = new Map(),
): ReadonlySet<string> {
  const theme = parseTheme(themeSource);
  const candidates = new Set<string>();
  for (const element of document.querySelectorAll('[class]')) {
    const className = element.getAttribute('class');
    if (!className) {
      continue;
    }
    try {
      for (const candidate of splitCandidateList(className)) {
        const sourceCandidate = sourceByAlias.get(candidate) ?? candidate;
        try {
          validateUtilityCandidate(sourceCandidate, theme);
          candidates.add(sourceCandidate);
        } catch {
          // Normal HTML may include application and third-party classes.
        }
      }
    } catch {
      // Ignore malformed class candidate lists.
    }
  }
  return candidates;
}
