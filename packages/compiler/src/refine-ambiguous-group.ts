import { isBorderColorValue } from './is-border-color-value';
import { isLengthArbitraryValue } from './is-length-arbitrary-value';

/**
 * Resolves prefixes whose value determines which CSS property they write.
 *
 * @param prefix Matched utility prefix.
 * @param group Default group from the prefix table.
 * @param utility Complete utility name.
 * @returns Most precise semantic group for the utility.
 */
export function refineAmbiguousGroup(prefix: string, group: string, utility: string): string {
  if (prefix === 'border-') {
    const value = utility.slice(prefix.length);
    if (value.startsWith('[') && value.endsWith(']') && isLengthArbitraryValue(value.slice(1, -1))) {
      return 'border-width';
    }
    return isBorderColorValue(value) ? 'border-color' : group;
  }
  if (prefix === 'outline-') {
    const value = utility.slice(prefix.length);
    if (value.startsWith('[') && value.endsWith(']') && isLengthArbitraryValue(value.slice(1, -1))) {
      return 'outline-width';
    }
    return isBorderColorValue(value) ? 'outline-color' : group;
  }
  if (prefix === 'decoration-') {
    const value = utility.slice(prefix.length);
    if (/^(solid|double|dotted|dashed|wavy)$/.test(value)) {
      return 'text-decoration-style';
    }
    return isBorderColorValue(value) ? 'text-decoration-color' : group;
  }
  if (prefix !== 'text-') {
    return group;
  }
  const value = utility.slice(prefix.length);
  if (/^(xs|sm|base|lg|xl|\d+xl)$/.test(value)) {
    return 'font-size';
  }
  if (value.startsWith('[') && value.endsWith(']') && isLengthArbitraryValue(value.slice(1, -1))) {
    return 'font-size';
  }
  if (/^(left|center|right|justify|start|end)$/.test(value)) {
    return 'text-align';
  }
  if (/^(ellipsis|clip|wrap|nowrap|balance|pretty)$/.test(value)) {
    return 'text-overflow';
  }
  return 'text-color';
}
