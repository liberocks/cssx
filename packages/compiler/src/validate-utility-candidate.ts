import { getUtilityAtoms } from './get-utility-atoms';
import type { CssxTheme } from './theme';

/**
 * Checks that a utility has CSS for the active theme.
 *
 * @param candidate A static utility string.
 * @param theme The active CSSX theme.
 * @returns Nothing.
 */
export function validateUtilityCandidate(candidate: string, theme: CssxTheme): void {
  getUtilityAtoms(candidate, theme);
}