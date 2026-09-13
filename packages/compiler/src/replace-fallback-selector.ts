import { escapeCssIdentifier } from './escape-css-identifier';

/** Rebinds one oracle CSS rule from its source utility selector to a CSSX selector. */
export function replaceFallbackSelector(css: string, candidate: string, selector: string): string {
  return css.split(`.${escapeCssIdentifier(candidate)}`).join(selector);
}