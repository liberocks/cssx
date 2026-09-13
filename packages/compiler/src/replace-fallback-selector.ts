import { escapeCssIdentifier } from './escape-css-identifier';

/**
 * Rebinds one oracle CSS rule from its source utility selector to a CSSX selector.
 *
 * @param css Oracle CSS containing the source selector.
 * @param candidate Source utility candidate.
 * @param selector Replacement CSSX selector.
 * @returns CSS with the source selector rebound.
 */
export function replaceFallbackSelector(css: string, candidate: string, selector: string): string {
  return css.split(`.${escapeCssIdentifier(candidate)}`).join(selector);
}
