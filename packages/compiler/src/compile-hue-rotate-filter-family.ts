import { filterDeclarations } from './filter-declarations';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves numeric and arbitrary hue-rotate filter channels.
 *
 * @param utility Utility name within the family.
 * @param negative Whether the candidate is negated.
 * @param property Target CSS filter property.
 * @param variablePrefix Prefix for channel custom properties.
 * @param semanticPrefix Prefix for semantic groups.
 * @param sink Combined filter value.
 * @returns Hue-rotate declarations, or null when unsupported.
 */
export function compileHueRotateFilterFamily(
  utility: string,
  negative: boolean,
  property: 'filter' | 'backdrop-filter',
  variablePrefix: string,
  semanticPrefix: string,
  sink: string,
): UtilityDeclaration[] | null {
  const hue = /^hue-rotate-(.+)$/.exec(utility);
  if (!hue) {
    return null;
  }
  const raw = hue[1]!;
  const value =
    raw.startsWith('[') && raw.endsWith(']')
      ? raw.slice(1, -1)
      : /^\d+$/.test(raw)
        ? `${negative ? '-' : ''}${raw}deg`
        : null;
  return value
    ? filterDeclarations(property, variablePrefix, semanticPrefix, sink, 'hue-rotate', `hue-rotate(${value})`)
    : null;
}
