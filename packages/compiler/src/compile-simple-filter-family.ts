import { FILTER_CHANNEL_VALUES } from './filter-channel-values';
import { filterDeclarations } from './filter-declarations';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves standard named and arbitrary filter channels.
 *
 * @param utility Utility name within the family.
 * @param property Target CSS filter property.
 * @param variablePrefix Prefix for channel custom properties.
 * @param semanticPrefix Prefix for semantic groups.
 * @param sink Combined filter value.
 * @param includesOpacity Whether this family supports opacity.
 * @returns Filter declarations, or null when unsupported.
 */
export function compileSimpleFilterFamily(
  utility: string,
  property: 'filter' | 'backdrop-filter',
  variablePrefix: string,
  semanticPrefix: string,
  sink: string,
  includesOpacity: boolean,
): UtilityDeclaration[] | null {
  const simple = /^(blur|brightness|contrast|grayscale|invert|saturate|sepia|opacity)(?:-(.+))?$/.exec(utility);
  if (!simple) {
    return null;
  }
  const family = simple[1]!;
  if (family === 'opacity' && !includesOpacity) {
    return null;
  }
  const raw = simple[2] ?? 'DEFAULT';
  const arbitrary = raw.startsWith('[') && raw.endsWith(']') ? raw.slice(1, -1) : null;
  const value = arbitrary ?? FILTER_CHANNEL_VALUES[family]?.[raw];
  if (!value) {
    return null;
  }
  const functionValue = family === 'blur' ? `blur(${value})` : `${family}(${value})`;
  return filterDeclarations(property, variablePrefix, semanticPrefix, sink, family, functionValue);
}
