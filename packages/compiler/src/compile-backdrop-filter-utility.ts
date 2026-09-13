import { compileFilterFamily } from './compile-filter-family';
import { CSSX_BACKDROP_FILTER_SINK } from './utility-effect-sinks';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles backdrop filter utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @returns Backdrop filter declarations, or null when unsupported.
 */
export function compileBackdropFilterUtility(utility: string, negative: boolean): UtilityDeclaration[] | null {
  if (!utility.startsWith('backdrop-')) {
    return null;
  }
  return compileFilterFamily(
    utility.slice('backdrop-'.length),
    negative,
    'backdrop-filter',
    '--cssx-backdrop-',
    'backdrop-',
    CSSX_BACKDROP_FILTER_SINK,
    true,
  );
}
